import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PurgeResult, RetentionCandidate, RetentionStore } from "./types";

export function createSupabaseRetentionStore(options: {
  url?: string;
  secretKey?: string;
  client?: SupabaseClient;
}): RetentionStore {
  const client = options.client ?? serverClient(options.url, options.secretKey);
  return {
    async claim(limit, dryRun, maxAttempts) {
      const { data, error } = await client.rpc("claim_retention_batch", {
        p_limit: limit,
        p_dry_run: dryRun,
        p_max_attempts: maxAttempts,
      });
      if (error)
        throw new Error(`Retention claim failed (${error.code ?? "unknown"}).`);
      return (data ?? []).map(
        (row: Record<string, unknown>) =>
          ({
            id: String(row.record_id),
            hash: String(row.record_hash),
            retentionClass: String(row.retention_class),
            dueAt: String(row.retention_due_at),
            learningAllowed: Boolean(row.learning_allowed),
          }) satisfies RetentionCandidate,
      );
    },
    async complete(candidate, systems) {
      const { data, error } = await client.rpc(
        "complete_design_quote_retention",
        { p_id: candidate.id, p_systems_purged: systems },
      );
      if (error)
        throw new Error(
          `Retention completion failed (${error.code ?? "unknown"}).`,
        );
      return Boolean(data);
    },
    async fail(candidate, code, maxAttempts) {
      const { error } = await client.rpc("fail_design_quote_retention", {
        p_id: candidate.id,
        p_failure_code: code,
        p_max_attempts: maxAttempts,
      });
      if (error)
        throw new Error(
          `Retention retry update failed (${error.code ?? "unknown"}).`,
        );
    },
    async status() {
      const { data, error } = await client.rpc("retention_status");
      if (error)
        throw new Error(
          `Retention status failed (${error.code ?? "unknown"}).`,
        );
      return (data ?? {}) as Record<string, unknown>;
    },
    async recordRun(summary) {
      const { error } = await client.rpc("record_retention_worker_run", {
        p_mode: summary.mode,
        p_candidates: summary.candidates,
        p_deleted: summary.deleted,
        p_deidentified: summary.deidentified,
        p_failed: summary.failed,
      });
      if (error)
        throw new Error(
          `Retention run ledger failed (${error.code ?? "unknown"}).`,
        );
    },
  };
}

export function inactivePurgeAdapters() {
  return [
    "object_storage",
    "search_vector",
    "cache_cdn",
    "crm_third_party",
  ].map((system) => ({
    system,
    async purge(): Promise<PurgeResult> {
      return { system, status: "not_connected" };
    },
  }));
}

function serverClient(url?: string, secretKey?: string) {
  if (!url?.trim() || !secretKey?.trim())
    throw new Error("Supabase retention storage is not configured.");
  return createClient(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
