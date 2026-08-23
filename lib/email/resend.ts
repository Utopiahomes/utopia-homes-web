import type { EmailProvider } from "./types";
export function createResendProvider(): EmailProvider {
  return { async send(message) { const key = process.env.RESEND_API_KEY; if (!key) return { skipped: true }; const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: message.from, to: [message.to], reply_to: message.replyTo, subject: message.subject, text: message.text }) }); if (!response.ok) throw new Error(`Transactional email provider returned ${response.status}.`); return await response.json() as { id: string }; } };
}
