import { describe, expect, it, vi } from "vitest";
import {
  addCalendarMonths,
  completedProjectDeadlines,
  meaningfulActivityDeadline,
} from "@/lib/retention/policy";
import { createRetentionService } from "@/lib/retention/service";
import type {
  PurgeAdapter,
  RetentionCandidate,
  RetentionStore,
} from "@/lib/retention/types";

const due: RetentionCandidate = {
  id: "synthetic",
  hash: "hash",
  retentionClass: "unconverted_quote",
  dueAt: "2026-01-01T00:00:00Z",
  learningAllowed: false,
};
function harness(
  candidate: RetentionCandidate | null = due,
  adapter?: PurgeAdapter,
) {
  const store: RetentionStore = {
    claim: vi.fn(async () => (candidate ? [candidate] : [])),
    complete: vi.fn(async () => true),
    fail: vi.fn(async () => {}),
    status: vi.fn(async () => ({})),
  };
  const service = createRetentionService({
    store,
    adapters: adapter ? [adapter] : [],
    env: { ...process.env, RETENTION_DELETION_ENABLED: "true" },
  });
  return { store, service };
}

describe("retention policy and worker", () => {
  it("uses calendar-month arithmetic at month end", () =>
    expect(
      addCalendarMonths(new Date("2024-02-29T12:00:00Z"), 12).toISOString(),
    ).toBe("2025-02-28T12:00:00.000Z"));
  it("moves deadlines only for meaningful activity", () => {
    const current = new Date("2027-01-01T00:00:00Z");
    expect(
      meaningfulActivityDeadline(current, {
        occurredAt: new Date("2026-06-01T00:00:00Z"),
        kind: "automated",
      }),
    ).toBe(current);
    expect(
      meaningfulActivityDeadline(current, {
        occurredAt: new Date("2026-06-01T00:00:00Z"),
        kind: "customer",
      }).toISOString(),
    ).toBe("2027-06-01T00:00:00.000Z");
  });
  it("uses seven-year core and 24-month upload deadlines after completion", () => {
    const dates = completedProjectDeadlines(new Date("2026-08-31T00:00:00Z"));
    expect(dates.core.toISOString()).toBe("2033-08-31T00:00:00.000Z");
    expect(dates.uploads.toISOString()).toBe("2028-08-31T00:00:00.000Z");
  });
  it("dry-runs without purging or completing", async () => {
    const { store, service } = harness();
    const result = await service.dryRun();
    expect(result).toMatchObject({
      mode: "dry_run",
      candidates: 1,
      deleted: 0,
    });
    expect(store.complete).not.toHaveBeenCalled();
  });
  it("deletes a due record and reports approved learning only with consent", async () => {
    const { store, service } = harness({ ...due, learningAllowed: true });
    const result = await service.run(false);
    expect(result).toMatchObject({ deleted: 1, deidentified: 1 });
    expect(store.complete).toHaveBeenCalledOnce();
  });
  it("retries partial failures without completing", async () => {
    const { store, service } = harness(due, {
      system: "storage",
      purge: vi.fn(async () => {
        throw new Error("synthetic");
      }),
    });
    const result = await service.run(false);
    expect(result.failed).toBe(1);
    expect(store.fail).toHaveBeenCalledOnce();
    expect(store.complete).not.toHaveBeenCalled();
  });
  it("detects orphaned derivatives", async () => {
    const { store, service } = harness(due, {
      system: "storage",
      purge: vi.fn(async () => ({
        system: "storage",
        status: "orphaned" as const,
      })),
    });
    const result = await service.run(false);
    expect(result.orphaned).toBe(1);
    expect(store.fail).toHaveBeenCalledOnce();
  });
  it("is idempotent when no record remains claimable, including after ledger replay", async () => {
    const { store, service } = harness(null);
    expect((await service.run(false)).deleted).toBe(0);
    expect(store.complete).not.toHaveBeenCalled();
  });
});
