import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { EmailProvider } from "./types";

const SMTP_HOST = "smtp.protonmail.ch";
const SMTP_PORT = 587;

type Transport = {
  sendMail(message: {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    text: string;
  }): Promise<{ messageId?: string }>;
  close?(): void;
};

type ProtonSmtpProviderOptions = {
  env?: NodeJS.ProcessEnv;
  createTransport?: (options: SMTPTransport.Options) => Transport;
};

export function createProtonSmtpProvider(options: ProtonSmtpProviderOptions = {}): EmailProvider {
  const env = options.env ?? process.env;
  const transportFactory = options.createTransport ?? ((transportOptions) => nodemailer.createTransport(transportOptions));

  return {
    async send(message) {
      const username = env.PROTON_SMTP_USER?.trim();
      const token = env.PROTON_SMTP_TOKEN?.trim();
      if (!username || !token) return { skipped: true };

      const transport = transportFactory({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false,
        requireTLS: true,
        auth: { user: username, pass: token },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        dnsTimeout: 10_000,
        logger: false,
        debug: false,
      });

      try {
        const result = await transport.sendMail(message);
        return { id: result.messageId };
      } catch (error) {
        throw new Error(sanitizedSmtpError(error));
      } finally {
        transport.close?.();
      }
    },
  };
}

export function sanitizedSmtpError(error: unknown) {
  const details = typeof error === "object" && error !== null ? error as { code?: unknown; responseCode?: unknown } : {};
  const code = typeof details.code === "string" ? details.code.toUpperCase() : "";
  const responseCode = typeof details.responseCode === "number" ? details.responseCode : undefined;

  if (code === "EAUTH" || responseCode === 535) return "Proton SMTP authentication failed.";
  if (["ETIMEDOUT", "ESOCKET", "ECONNECTION", "EDNS"].includes(code)) return "Proton SMTP connection failed or timed out.";
  if (responseCode) return `Proton SMTP delivery failed with response code ${responseCode}.`;
  return "Proton SMTP delivery failed.";
}
