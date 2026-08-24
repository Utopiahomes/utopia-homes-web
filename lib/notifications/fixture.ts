import { randomUUID } from "node:crypto";
import type { Submission } from "@/types/content";
import type { ClaimedNotification, NotificationStatus, NotificationStore } from "./types";

type FixtureRecord = {
  id: string;
  submission: Submission;
  status: NotificationStatus;
  attemptCount: number;
  nextAttemptAt: number;
  lockedUntil: number;
  leaseToken: string | null;
  providerMessageId: string | null;
  lastError: string | null;
  recipient: string | null;
};

const records = new Map<string, FixtureRecord>();

function claim(record: FixtureRecord, leaseSeconds: number): ClaimedNotification | null {
  const now = Date.now();
  if (record.status === "sent" || record.status === "dead" || record.nextAttemptAt > now || record.lockedUntil > now) return null;
  record.attemptCount += 1;
  record.lockedUntil = now + leaseSeconds * 1000;
  record.leaseToken = randomUUID();
  return { id: record.id, submissionId: record.submission.id, kind: record.submission.kind, status: record.status, attemptCount: record.attemptCount, leaseToken: record.leaseToken, submission: record.submission };
}

export const fixtureNotificationStore: NotificationStore = {
  async ensure(submission) {
    if (!records.has(submission.id)) records.set(submission.id, { id: submission.id, submission, status: "pending", attemptCount: 0, nextAttemptAt: 0, lockedUntil: 0, leaseToken: null, providerMessageId: null, lastError: null, recipient: null });
  },
  async claimById(id, leaseSeconds) {
    const record = records.get(id);
    return record ? claim(record, leaseSeconds) : null;
  },
  async claimDue(limit, leaseSeconds) {
    const claimed: ClaimedNotification[] = [];
    for (const record of records.values()) {
      const item = claim(record, leaseSeconds);
      if (item) claimed.push(item);
      if (claimed.length >= limit) break;
    }
    return claimed;
  },
  async markSent(id, leaseToken, providerMessageId, recipient) {
    const record = records.get(id);
    if (!record || record.leaseToken !== leaseToken || record.status === "sent") return false;
    record.status = "sent";
    record.providerMessageId = providerMessageId;
    record.recipient = recipient;
    record.leaseToken = null;
    record.lockedUntil = 0;
    return true;
  },
  async markFailed(id, leaseToken, error, recipient, maxAttempts) {
    const record = records.get(id);
    if (!record || record.leaseToken !== leaseToken || record.status === "sent") return null;
    record.status = record.attemptCount >= maxAttempts ? "dead" : "failed";
    record.nextAttemptAt = Date.now() + Math.min(21_600_000, 300_000 * 2 ** Math.max(0, record.attemptCount - 1));
    record.lastError = error;
    record.recipient = recipient;
    record.leaseToken = null;
    record.lockedUntil = 0;
    return record.status;
  },
};

export function clearFixtureNotifications() { records.clear(); }
export function getFixtureNotifications() { return [...records.values()].map((record) => ({ ...record })); }
export function makeFixtureNotificationDue(id: string) { const record = records.get(id); if (record) { record.nextAttemptAt = 0; record.lockedUntil = 0; } }
