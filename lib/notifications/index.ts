import { fixtureNotificationStore } from "./fixture.js";
import { createNotificationService } from "./service.js";
import { createSupabaseNotificationStore } from "./supabase.js";
import type { NotificationStore } from "./types.js";

let resolvedStore: NotificationStore | undefined;

export function resolveNotificationStore(env: NodeJS.ProcessEnv = process.env): NotificationStore {
  const mode = env.SUBMISSION_STORE?.trim().toLowerCase();
  if (mode === "memory" || (!mode && env.NODE_ENV !== "production")) return fixtureNotificationStore;
  if (mode === "supabase") return createSupabaseNotificationStore({ url: env.SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY });
  throw new Error("Notification storage requires SUBMISSION_STORE='supabase' outside local/test development.");
}

function getStore() { resolvedStore ??= resolveNotificationStore(); return resolvedStore; }

const notificationStore: NotificationStore = {
  ensure: (submission) => getStore().ensure(submission),
  claimById: (id, leaseSeconds) => getStore().claimById(id, leaseSeconds),
  claimDue: (limit, leaseSeconds) => getStore().claimDue(limit, leaseSeconds),
  markSent: (id, leaseToken, providerMessageId, recipient) => getStore().markSent(id, leaseToken, providerMessageId, recipient),
  markFailed: (id, leaseToken, error, recipient, maxAttempts) => getStore().markFailed(id, leaseToken, error, recipient, maxAttempts),
};

export const notificationService = createNotificationService({ store: notificationStore });
