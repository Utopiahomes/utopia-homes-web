import { createProtonSmtpProvider } from "./proton-smtp";
import { createResendProvider } from "./resend";
import type { EmailProvider } from "./types";

export type EmailProviderName = "proton" | "resend" | "disabled";

export function selectedEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProviderName {
  const value = env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (value === "proton" || value === "resend") return value;
  return "disabled";
}

export function createEmailProvider(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  const selected = selectedEmailProvider(env);
  if (selected === "proton") return createProtonSmtpProvider({ env });
  if (selected === "resend") return createResendProvider(env);
  return { async send() { return { skipped: true }; } };
}

export function emailFromAddress(env: NodeJS.ProcessEnv = process.env) {
  const selected = selectedEmailProvider(env);
  if (selected === "proton") return env.PROTON_SMTP_FROM?.trim();
  if (selected === "resend") return env.RESEND_FROM_EMAIL?.trim();
  return undefined;
}

export function emailProviderConfigured(env: NodeJS.ProcessEnv = process.env) {
  const selected = selectedEmailProvider(env);
  if (selected === "proton") {
    return Boolean(env.PROTON_SMTP_USER?.trim() && env.PROTON_SMTP_TOKEN?.trim() && env.PROTON_SMTP_FROM?.trim());
  }
  if (selected === "resend") return Boolean(env.RESEND_API_KEY?.trim() && env.RESEND_FROM_EMAIL?.trim());
  return false;
}
