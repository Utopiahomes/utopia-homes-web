import { describe, expect, it, vi } from "vitest";
import { createProtonSmtpProvider } from "@/lib/email/proton-smtp";

const env = {
  ...process.env,
  PROTON_SMTP_USER: "ray@utopiahomes.com",
  PROTON_SMTP_TOKEN: "smtp-token-that-must-never-leak",
};

const message = {
  from: "Utopia Homes <ray@utopiahomes.com>",
  to: "ray@utopiahomes.com",
  replyTo: "guest@example.com",
  subject: "New contact request",
  text: "Stored submission details",
};

describe("Proton SMTP provider", () => {
  it("uses Proton's STARTTLS submission settings and returns the SMTP message ID", async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: "smtp-message-1" });
    const close = vi.fn();
    const createTransport = vi.fn().mockReturnValue({ sendMail, close });
    const provider = createProtonSmtpProvider({ env, createTransport });

    await expect(provider.send(message)).resolves.toEqual({ id: "smtp-message-1" });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: "smtp.protonmail.ch",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: "ray@utopiahomes.com", pass: "smtp-token-that-must-never-leak" },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
      debug: false,
      logger: false,
    }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ replyTo: "guest@example.com" }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("sanitizes bad-credential failures", async () => {
    const createTransport = vi.fn().mockReturnValue({
      sendMail: vi.fn().mockRejectedValue(Object.assign(new Error(`535 ${env.PROTON_SMTP_TOKEN}`), { code: "EAUTH", responseCode: 535 })),
    });
    const provider = createProtonSmtpProvider({ env, createTransport });

    await expect(provider.send(message)).rejects.toThrow("Proton SMTP authentication failed.");
    await expect(provider.send(message)).rejects.not.toThrow(String(env.PROTON_SMTP_TOKEN));
  });

  it("sanitizes provider timeouts", async () => {
    const createTransport = vi.fn().mockReturnValue({
      sendMail: vi.fn().mockRejectedValue(Object.assign(new Error("socket timed out with sensitive context"), { code: "ETIMEDOUT" })),
    });
    const provider = createProtonSmtpProvider({ env, createTransport });

    await expect(provider.send(message)).rejects.toThrow("Proton SMTP connection failed or timed out.");
  });

  it("skips safely when the generated SMTP credentials are absent", async () => {
    const createTransport = vi.fn();
    const provider = createProtonSmtpProvider({ env: { ...process.env, PROTON_SMTP_USER: "", PROTON_SMTP_TOKEN: "" }, createTransport });

    await expect(provider.send(message)).resolves.toEqual({ skipped: true });
    expect(createTransport).not.toHaveBeenCalled();
  });
});
