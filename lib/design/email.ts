import { createEmailProvider, emailFromAddress, emailProviderConfigured } from "@/lib/email/provider";
import type { AcknowledgedQuote } from "./types";

export async function sendDesignQuoteEmailBestEffort(quote: AcknowledgedQuote, env: NodeJS.ProcessEnv = process.env) {
  if (env.DESIGN_QUOTE_EMAILS_ENABLED !== "true" || !emailProviderConfigured(env)) return "skipped" as const;
  const from = emailFromAddress(env);
  if (!from) return "skipped" as const;
  const lineItems = quote.lineItems.map((line) => `- ${line.label}: ${money(line.amount)}`).join("\n");
  try {
    await createEmailProvider(env).send({
      from, to: quote.customer.email, replyTo: from, subject: `Your Utopia Design estimate — ${quote.quoteNumber}`,
      text: `Hi ${quote.customer.name},\n\nYour preliminary Utopia Design estimate is ${money(quote.total)}.\n\n${lineItems}\n\nThis estimate is valid through ${new Date(quote.expiresAt).toLocaleDateString("en-US", { timeZone: "UTC" })}. It is preliminary and nonbinding; final pricing follows designer review of the property, scope, availability, delivery requirements, and schedule. Sales tax is excluded.\n\nUtopia Design`,
    }, { idempotencyKey: `design-quote/${quote.id}/${quote.ruleSetVersion}` });
    return "sent" as const;
  } catch (error) {
    console.error("Design quote customer email failed", error instanceof Error ? error.message : "Unknown email error");
    return "needs_review" as const;
  }
}

function money(value: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }
