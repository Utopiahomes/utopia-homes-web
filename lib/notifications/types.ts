import type { Submission } from "@/types/content";

export type NotificationStatus = "pending" | "failed" | "sent" | "dead";

export type ClaimedNotification = {
  id: string;
  submissionId: string;
  kind: Submission["kind"];
  status: NotificationStatus;
  attemptCount: number;
  leaseToken: string;
  submission: Submission;
};

export interface NotificationStore {
  ensure(submission: Submission): Promise<void>;
  claimById(id: string, leaseSeconds: number): Promise<ClaimedNotification | null>;
  claimDue(limit: number, leaseSeconds: number): Promise<ClaimedNotification[]>;
  markSent(id: string, leaseToken: string, providerMessageId: string | null, recipient: string): Promise<boolean>;
  markFailed(id: string, leaseToken: string, error: string, recipient: string, maxAttempts: number): Promise<NotificationStatus | null>;
}
