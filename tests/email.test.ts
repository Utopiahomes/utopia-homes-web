import { afterEach, describe, expect, it, vi } from "vitest";
import { sendSubmissionEmails } from "@/lib/email/submissions";
import { createResendProvider } from "@/lib/email/resend";

describe("transactional email", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("is a safe no-op without server credentials", async () => {
    const result = await sendSubmissionEmails({ kind: "membership", id: "test", submittedAt: new Date(0).toISOString(), consent: true, name: "Ray", email: "ray@example.com" });
    expect(result).toEqual({ notification: "skipped", confirmation: "skipped" });
  });

  it("passes the stable idempotency key to Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "email-1" }), { status: 200, headers: { "Content-Type": "application/json" } }));
    await createResendProvider().send({ from: "from@example.com", to: "to@example.com", subject: "Lead", text: "Stored" }, { idempotencyKey: "submission-notification/lead-1" });
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({ headers: expect.objectContaining({ "Idempotency-Key": "submission-notification/lead-1", "User-Agent": "utopia-homes-web/1.0" }) }));
  });
});
