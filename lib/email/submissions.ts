import type { Submission } from "@/types/content";
import { createResendProvider } from "./resend";

const provider = createResendProvider();
const labels = { "owner-lead": "New owner lead", membership: "New membership signup", contact: "New contact request", "design-inquiry": "New property enhancement inquiry" } as const;
function notificationRecipient(submission: Submission) { if (submission.kind === "owner-lead" || submission.kind === "design-inquiry") return process.env.UTOPIA_OWNERS_EMAIL ?? process.env.UTOPIA_NOTIFICATION_EMAIL; return process.env.UTOPIA_NOTIFICATION_EMAIL; }
function notificationText(submission: Submission) { const safe = Object.entries(submission).filter(([key]) => !["kind", "id"].includes(key)).map(([key, value]) => `${key}: ${String(value ?? "")}`).join("\n"); return `${labels[submission.kind]}\n\n${safe}\n\nRecord ID: ${submission.id}`; }
export async function sendSubmissionEmails(submission: Submission) {
  const from = process.env.RESEND_FROM_EMAIL; const recipient = notificationRecipient(submission);
  if (!from || !recipient) return { notification: "skipped" as const, confirmation: "skipped" as const };
  await provider.send({ from, to: recipient, replyTo: submission.email, subject: `${labels[submission.kind]} — ${submission.name}`, text: notificationText(submission) });
  const confirmationEnabled = process.env.SEND_CONFIRMATION_EMAILS === "true";
  if (confirmationEnabled) await provider.send({ from, to: submission.email, subject: "We received your Utopia Homes request", text: `Hi ${submission.name},\n\nThank you for getting in touch with Utopia Homes. We received your ${submission.kind === "membership" ? "membership interest" : "request"} and will follow up as appropriate.\n\nUtopia Homes` });
  return { notification: "sent" as const, confirmation: confirmationEnabled ? "sent" as const : "skipped" as const };
}
