import { createHash } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AcknowledgedQuote, PreliminaryQuote } from "./types";

export interface DesignQuoteStore {
  create(quote: PreliminaryQuote, reopenTokenHash: string): Promise<void>;
  acknowledge(id: string, reopenTokenHash: string, customer: AcknowledgedQuote["customer"], acknowledgedAt: string, disclaimerVersion: string, modelImprovementConsent: boolean): Promise<AcknowledgedQuote | null>;
}

const memoryQuotes = new Map<string, { quote: PreliminaryQuote; tokenHash: string }>();
export const memoryDesignQuoteStore: DesignQuoteStore = {
  async create(quote, tokenHash) { memoryQuotes.set(quote.id, { quote, tokenHash }); },
  async acknowledge(id, tokenHash, customer, acknowledgedAt, disclaimerVersion, modelImprovementConsent) {
    const found = memoryQuotes.get(id);
    if (!found || found.tokenHash !== tokenHash || found.quote.status !== "generated") return null;
    const acknowledged: AcknowledgedQuote = { ...found.quote, status: "acknowledged", customer, acknowledgedAt, disclaimerVersion, reopenTokenHash: tokenHash, modelImprovementConsent, modelImprovementConsentAt: modelImprovementConsent ? acknowledgedAt : undefined };
    memoryQuotes.set(id, { quote: acknowledged, tokenHash });
    return acknowledged;
  },
};

export function clearMemoryDesignQuotes() { memoryQuotes.clear(); }

export function createSupabaseDesignQuoteStore(options: { url?: string; secretKey?: string; client?: SupabaseClient }): DesignQuoteStore {
  const client = options.client ?? createServerClient(options.url, options.secretKey);
  return {
    async create(quote, tokenHash) {
      const retentionExpiresAt = new Date(quote.generatedAt); retentionExpiresAt.setUTCMonth(retentionExpiresAt.getUTCMonth() + retentionMonths());
      const { error } = await client.from("design_quotes").insert({
        id: quote.id, quote_number: quote.quoteNumber, status: quote.status, audience: quote.audience, service_id: quote.serviceId,
        rule_set_version: quote.ruleSetVersion, input_snapshot: quote.inputSnapshot, line_items: quote.lineItems, raw_total: quote.rawTotal, subtotal: quote.subtotal,
        total: quote.total, assumptions: quote.assumptions, exclusions: quote.exclusions, manual_review_reasons: quote.manualReviewReasons, internal_pricing_review: quote.internalPricingReview ?? null, completeness_score: quote.completenessScore,
        generated_at: quote.generatedAt, expires_at: quote.expiresAt, reopen_token_hash: tokenHash, retention_policy_version: "2026-08-27.v2", retention_category: "unconverted_quote", retention_expires_at: retentionExpiresAt.toISOString(), legal_hold: false,
      });
      if (error) throw new Error(`Supabase design quote insert failed (${error.code ?? "unknown"}).`);
    },
    async acknowledge(id, tokenHash, customer, acknowledgedAt, disclaimerVersion, modelImprovementConsent) {
      const { data, error } = await client.from("design_quotes").update({ status: "acknowledged", customer_name: customer.name, customer_email: customer.email.toLowerCase(), customer_phone: customer.phone || null, disclaimer_version: disclaimerVersion, acknowledged_at: acknowledgedAt, model_improvement_consent: modelImprovementConsent, model_improvement_consent_at: modelImprovementConsent ? acknowledgedAt : null }).eq("id", id).eq("reopen_token_hash", tokenHash).eq("status", "generated").select("*").maybeSingle();
      if (error) throw new Error(`Supabase design quote acknowledgment failed (${error.code ?? "unknown"}).`);
      return data ? fromDatabaseRow(data as Record<string, unknown>) : null;
    },
  };
}

let resolved: DesignQuoteStore | undefined;
export function resolveDesignQuoteStore(env: NodeJS.ProcessEnv = process.env) {
  const mode = env.DESIGN_QUOTE_STORE?.trim().toLowerCase() || env.SUBMISSION_STORE?.trim().toLowerCase();
  if (mode === "memory" || (!mode && env.NODE_ENV !== "production")) return memoryDesignQuoteStore;
  if (mode === "supabase") return createSupabaseDesignQuoteStore({ url: env.SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY });
  throw new Error("DESIGN_QUOTE_STORE must be set to 'supabase' outside local/test development.");
}
export const designQuoteStore: DesignQuoteStore = {
  create: (...args) => (resolved ??= resolveDesignQuoteStore()).create(...args),
  acknowledge: (...args) => (resolved ??= resolveDesignQuoteStore()).acknowledge(...args),
};

export function hashReopenToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
function createServerClient(url?: string, secretKey?: string) {
  if (!url?.trim() || !secretKey?.trim()) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are required for Supabase quote storage.");
  return createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
function retentionMonths(env: NodeJS.ProcessEnv = process.env) { const value = Number(env.DESIGN_UNCONVERTED_RETENTION_MONTHS ?? "12"); return Number.isInteger(value) && value > 0 && value <= 120 ? value : 12; }
function fromDatabaseRow(row: Record<string, unknown>): AcknowledgedQuote {
  return {
    id: String(row.id), quoteNumber: String(row.quote_number), status: "acknowledged", audience: row.audience as AcknowledgedQuote["audience"], serviceId: row.service_id as AcknowledgedQuote["serviceId"], ruleSetVersion: String(row.rule_set_version),
    inputSnapshot: row.input_snapshot as AcknowledgedQuote["inputSnapshot"], lineItems: row.line_items as AcknowledgedQuote["lineItems"], rawTotal: Number(row.raw_total), subtotal: Number(row.subtotal), total: Number(row.total), assumptions: row.assumptions as string[], exclusions: row.exclusions as string[], manualReviewReasons: row.manual_review_reasons as AcknowledgedQuote["manualReviewReasons"], internalPricingReview: row.internal_pricing_review as AcknowledgedQuote["internalPricingReview"], completenessScore: Number(row.completeness_score), generatedAt: String(row.generated_at), expiresAt: String(row.expires_at),
    customer: { name: String(row.customer_name), email: String(row.customer_email), phone: row.customer_phone ? String(row.customer_phone) : undefined }, disclaimerVersion: String(row.disclaimer_version), acknowledgedAt: String(row.acknowledged_at), reopenTokenHash: String(row.reopen_token_hash), modelImprovementConsent: Boolean(row.model_improvement_consent), modelImprovementConsentAt: row.model_improvement_consent_at ? String(row.model_improvement_consent_at) : undefined,
  };
}
