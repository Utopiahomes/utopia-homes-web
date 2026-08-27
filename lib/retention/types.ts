export type RetentionCandidate = {
  id: string;
  hash: string;
  retentionClass: string;
  dueAt: string;
  learningAllowed: boolean;
};

export type PurgeResult = {
  system: string;
  status: "purged" | "not_connected" | "orphaned";
};

export interface PurgeAdapter {
  readonly system: string;
  purge(candidate: RetentionCandidate): Promise<PurgeResult>;
}

export interface RetentionStore {
  claim(
    limit: number,
    dryRun: boolean,
    maxAttempts: number,
  ): Promise<RetentionCandidate[]>;
  complete(
    candidate: RetentionCandidate,
    systems: PurgeResult[],
  ): Promise<boolean>;
  fail(
    candidate: RetentionCandidate,
    failureCode: string,
    maxAttempts: number,
  ): Promise<void>;
  status(): Promise<Record<string, unknown>>;
  recordRun?(summary: {
    mode: string;
    candidates: number;
    deleted: number;
    deidentified: number;
    failed: number;
  }): Promise<void>;
}
