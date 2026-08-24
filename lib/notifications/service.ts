import type { Submission } from "@/types/content";
import { createResendProvider } from "@/lib/email/resend";
import { submissionNotificationMessage } from "@/lib/email/submissions";
import type { EmailProvider } from "@/lib/email/types";
import type { ClaimedNotification, NotificationStatus, NotificationStore } from "./types";

const DEFAULT_LEASE_SECONDS = 300;
const DEFAULT_MAX_ATTEMPTS = 6;
const DEFAULT_BATCH_SIZE = 20;

type NotificationServiceOptions = {
  store: NotificationStore;
  provider?: EmailProvider;
  env?: NodeJS.ProcessEnv;
  leaseSeconds?: number;
  maxAttempts?: number;
};

export function createNotificationService(options: NotificationServiceOptions) {
  const provider = options.provider ?? createResendProvider();
  const env = options.env ?? process.env;
  const leaseSeconds = options.leaseSeconds ?? DEFAULT_LEASE_SECONDS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  async function deliverClaimed(item: ClaimedNotification) {
    const message = submissionNotificationMessage(item.submission, env);
    const recipient = message?.to ?? "unconfigured";
    if (!message) return fail(item, "Notification sender or recipient is not configured.", recipient);

    try {
      const result = await provider.send(message, { idempotencyKey: notificationIdempotencyKey(item.id) });
      if (result.skipped) throw new Error("Transactional email provider is not configured.");
      const marked = await options.store.markSent(item.id, item.leaseToken, result.id ?? null, recipient);
      if (!marked) return { id: item.id, status: "ignored" as const };
      await sendConfirmationBestEffort(item.submission, provider, env);
      return { id: item.id, status: "sent" as const };
    } catch (error) {
      return fail(item, safeError(error), recipient);
    }
  }

  async function fail(item: ClaimedNotification, error: string, recipient: string) {
    try {
      const status = await options.store.markFailed(item.id, item.leaseToken, error, recipient, maxAttempts);
      return { id: item.id, status: status ?? "ignored" as NotificationStatus | "ignored" };
    } catch (storageError) {
      console.error("Notification retry state update failed", safeError(storageError));
      return { id: item.id, status: "failed" as const };
    }
  }

  return {
    async enqueueAndAttempt(submission: Submission) {
      try {
        await options.store.ensure(submission);
        if (!notificationSendingEnabled(env)) return { id: submission.id, status: "pending" as const };
        const item = await options.store.claimById(submission.id, leaseSeconds);
        return item ? deliverClaimed(item) : { id: submission.id, status: "ignored" as const };
      } catch (error) {
        console.error("Notification enqueue or immediate delivery failed", safeError(error));
        return { id: submission.id, status: "failed" as const };
      }
    },
    async retryDue(limit = DEFAULT_BATCH_SIZE) {
      if (!notificationSendingEnabled(env)) return { claimed: 0, sent: 0, failed: 0, dead: 0, ignored: 0, disabled: true };
      const items = await options.store.claimDue(Math.max(1, Math.min(limit, 100)), leaseSeconds);
      const summary = { claimed: items.length, sent: 0, failed: 0, dead: 0, ignored: 0, disabled: false };
      for (const item of items) {
        const result = await deliverClaimed(item);
        if (result.status === "sent") summary.sent += 1;
        else if (result.status === "dead") summary.dead += 1;
        else if (result.status === "ignored") summary.ignored += 1;
        else summary.failed += 1;
      }
      return summary;
    },
  };
}

export function notificationIdempotencyKey(notificationId: string) { return `submission-notification/${notificationId}`; }

export function notificationSendingEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NOTIFICATION_EMAIL_ENABLED !== "false" && Boolean(env.RESEND_API_KEY?.trim() && env.RESEND_FROM_EMAIL?.trim() && (env.UTOPIA_NOTIFICATION_EMAIL?.trim() || env.UTOPIA_OWNERS_EMAIL?.trim()));
}

async function sendConfirmationBestEffort(submission: Submission, provider: EmailProvider, env: NodeJS.ProcessEnv) {
  if (env.SEND_CONFIRMATION_EMAILS !== "true" || !env.RESEND_FROM_EMAIL?.trim()) return;
  try {
    await provider.send({ from: env.RESEND_FROM_EMAIL, to: submission.email, subject: "We received your Utopia Homes request", text: `Hi ${submission.name},\n\nThank you for getting in touch with Utopia Homes. We received your ${submission.kind === "membership" ? "membership interest" : "request"} and will follow up as appropriate.\n\nUtopia Homes` }, { idempotencyKey: `submission-confirmation/${submission.id}` });
  } catch (error) {
    console.error("Submission confirmation email failed", safeError(error));
  }
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown notification error";
  return message.replace(/(?:re_|sb_secret_)[A-Za-z0-9_-]+/g, "[redacted]").slice(0, 500);
}
