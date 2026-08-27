import type { PurgeAdapter, RetentionCandidate, RetentionStore } from "./types";

export function createRetentionService(options: {
  store: RetentionStore;
  adapters: PurgeAdapter[];
  env?: NodeJS.ProcessEnv;
}) {
  const env = options.env ?? process.env;
  const batchSize = boundedNumber(env.RETENTION_BATCH_SIZE, 25, 1, 100);
  const maxAttempts = boundedNumber(env.RETENTION_MAX_ATTEMPTS, 5, 1, 20);

  async function run(forceDryRun?: boolean) {
    const dryRun = forceDryRun ?? env.RETENTION_DELETION_ENABLED !== "true";
    const candidates = await options.store.claim(
      batchSize,
      dryRun,
      maxAttempts,
    );
    const summary = {
      mode: dryRun ? "dry_run" : "delete",
      candidates: candidates.length,
      deleted: 0,
      deidentified: 0,
      failed: 0,
      orphaned: 0,
    };
    if (dryRun) {
      await options.store.recordRun?.(summary);
      return { ...summary, records: candidates.map(publicCandidate) };
    }
    for (const candidate of candidates) {
      try {
        const systems = [];
        for (const adapter of options.adapters)
          systems.push(await adapter.purge(candidate));
        const orphaned = systems.filter(
          (item) => item.status === "orphaned",
        ).length;
        if (orphaned)
          throw new RetentionFailure("ORPHANED_DERIVATIVE", orphaned);
        const completed = await options.store.complete(candidate, systems);
        if (completed) {
          summary.deleted += 1;
          if (candidate.learningAllowed) summary.deidentified += 1;
        }
      } catch (error) {
        summary.failed += 1;
        if (error instanceof RetentionFailure) summary.orphaned += error.count;
        await options.store.fail(candidate, failureCode(error), maxAttempts);
      }
    }
    await options.store.recordRun?.(summary);
    return summary;
  }

  return {
    run,
    dryRun: () => run(true),
    status: async () => monitoredStatus(await options.store.status()),
  };
}

function monitoredStatus(status: Record<string, unknown>) {
  const alerts: string[] = [];
  const last =
    typeof status.last_completed_at === "string"
      ? new Date(status.last_completed_at)
      : null;
  if (!last || Date.now() - last.getTime() > 26 * 60 * 60 * 1000)
    alerts.push("WORKER_STALE_26H");
  if (Number(status.overdue_48h ?? 0) > 0) alerts.push("RECORD_OVERDUE_48H");
  if (Number(status.failed ?? 0) > 0) alerts.push("FAILED_RETRYABLE");
  if (Number(status.retry_limit_reached ?? 0) > 0)
    alerts.push("RETRY_LIMIT_REACHED");
  return { ...status, alerts };
}

function publicCandidate(candidate: RetentionCandidate) {
  return {
    hashedRecordReference: candidate.hash,
    retentionClass: candidate.retentionClass,
    dueAt: candidate.dueAt,
    learningAllowed: candidate.learningAllowed,
  };
}

function boundedNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : fallback;
}

function failureCode(error: unknown) {
  return error instanceof RetentionFailure ? error.code : "PURGE_FAILED";
}

class RetentionFailure extends Error {
  constructor(
    readonly code: string,
    readonly count = 0,
  ) {
    super(code);
  }
}
