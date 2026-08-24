import type { Submission } from "@/types/content";
import { createResendProvider } from "./resend";

const provider = createResendProvider();
const labels = { "owner-lead": "New owner lead", membership: "New membership signup", contact: "New contact request", "design-inquiry": "New property enhancement inquiry" } as const;
export function notificationRecipient(submission: Submission, env: NodeJS.ProcessEnv = process.env) { if (submission.kind === "owner-lead" || submission.kind === "design-inquiry") return env.UTOPIA_OWNERS_EMAIL ?? env.UTOPIA_NOTIFICATION_EMAIL; return env.UTOPIA_NOTIFICATION_EMAIL; }
export function notificationText(submission: Submission) { const safe = Object.entries(submission).filter(([key]) => !["kind", "id"].includes(key)).map(([key, value]) => `${key}: ${String(value ?? "")}`).join("\n"); return `${labels[submission.kind]}\n\n${safe}\n\nRecord ID: ${submission.id}`; }
export function submissionNotificationMessage(submission: Submission, env: NodeJS.ProcessEnv = process.env) {
  const from = env.RESEND_FROM_EMAIL;
  const recipient = notificationRecipient(submission, env);
  if (!from?.trim() || !recipient?.trim()) return null;
  return { from, to: recipient, replyTo: submission.email, subject: `${labels[submission.kind]} — ${submission.name}`, text: notificationText(submission) };
}
export async function sendSubmissionEmails(submission: Submission) {
  const message = submissionNotificationMessage(submission);
  if (!message) return { notification: "skipped" as const, confirmation: "skipped" as const };
  await provider.send(message);
  const confirmationEnabled = process.env.SEND_CONFIRMATION_EMAILS === "true";
  if (confirmationEnabled) await provider.send({ from: message.from, to: submission.email, subject: "We received your Utopia Homes request", text: `Hi ${submission.name},\n\nThank you for getting in touch with Utopia Homes. We received your ${submission.kind === "membership" ? "membership interest" : "request"} and will follow up as appropriate.\n\nUtopia Homes` });
  return { notification: "sent" as const, confirmation: confirmationEnabled ? "sent" as const : "skipped" as const };
}
