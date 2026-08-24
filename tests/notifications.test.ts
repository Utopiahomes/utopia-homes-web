import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OwnerLead } from "@/types/content";
import { submitForm } from "@/lib/forms/submit";
import { fixtureSubmissionStore, clearFixtureSubmissions, getFixtureSubmissions } from "@/lib/submissions/fixture";
import { clearFixtureNotifications, fixtureNotificationStore, getFixtureNotifications, makeFixtureNotificationDue } from "@/lib/notifications/fixture";
import { createNotificationService, notificationIdempotencyKey } from "@/lib/notifications/service";
import type { EmailProvider } from "@/lib/email/types";
import type { FormKind } from "@/lib/forms/schemas";

const enabledEnv = {
  ...process.env,
  RESEND_API_KEY: "re_test",
  RESEND_FROM_EMAIL: "Utopia Homes <notifications@example.com>",
  LEAD_NOTIFICATION_EMAIL: "ray@utopiahomes.com",
  SEND_CONFIRMATION_EMAILS: "false",
};

function owner(id: string): OwnerLead {
  return { id, kind: "owner-lead", submittedAt: "2026-08-24T12:00:00.000Z", name: "Ray DeLuca", email: "ray@example.com", consent: true, listingUrl: "https://example.com/home" };
}

function serviceWith(provider: EmailProvider, maxAttempts = 6) {
  return createNotificationService({ store: fixtureNotificationStore, provider, env: enabledEnv, maxAttempts });
}

describe("durable notification outbox", () => {
  beforeEach(() => { clearFixtureSubmissions(); clearFixtureNotifications(); vi.restoreAllMocks(); });

  it("marks a successful immediate notification sent with provider metadata", async () => {
    const send = vi.fn().mockResolvedValue({ id: "email-1" });
    const submission = owner("10000000-0000-4000-8000-000000000001");
    const result = await serviceWith({ send }).enqueueAndAttempt(submission);
    expect(result.status).toBe("sent");
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "ray@utopiahomes.com", replyTo: "ray@example.com" }), { idempotencyKey: notificationIdempotencyKey(submission.id) });
    expect(getFixtureNotifications()[0]).toMatchObject({ status: "sent", attemptCount: 1, providerMessageId: "email-1" });
  });

  it("keeps the lead stored and the notification retryable when the provider fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const notifications = serviceWith({ send: vi.fn().mockRejectedValue(new Error("provider offline")) });
    const result = await submitForm("owner-lead", { name: "Ray DeLuca", email: "ray@example.com", listingUrl: "https://example.com/home", consent: true, website: "" }, fixtureSubmissionStore, notifications);
    expect(result).toMatchObject({ ok: true, status: 201 });
    expect(getFixtureSubmissions()).toHaveLength(1);
    expect(getFixtureNotifications()[0]).toMatchObject({ status: "failed", attemptCount: 1, lastError: "provider offline" });
  });

  it("retries later and moves a failed notification to sent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const send = vi.fn().mockRejectedValueOnce(new Error("temporary")).mockResolvedValueOnce({ id: "email-2" });
    const submission = owner("10000000-0000-4000-8000-000000000002");
    const service = serviceWith({ send });
    await service.enqueueAndAttempt(submission);
    makeFixtureNotificationDue(submission.id);
    const result = await service.retryDue();
    expect(result).toMatchObject({ claimed: 1, sent: 1 });
    expect(getFixtureNotifications()[0]).toMatchObject({ status: "sent", attemptCount: 2, providerMessageId: "email-2" });
  });

  it("allows only one concurrent worker to claim a notification", async () => {
    const send = vi.fn().mockResolvedValue({ id: "email-3" });
    const submission = owner("10000000-0000-4000-8000-000000000003");
    await fixtureNotificationStore.ensure(submission);
    const service = serviceWith({ send });
    await Promise.all([service.retryDue(), service.retryDue()]);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("marks a notification dead after the maximum attempts", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const submission = owner("10000000-0000-4000-8000-000000000004");
    const service = serviceWith({ send: vi.fn().mockRejectedValue(new Error("permanent rejection")) }, 2);
    await service.enqueueAndAttempt(submission);
    makeFixtureNotificationDue(submission.id);
    await service.retryDue();
    expect(getFixtureNotifications()[0]).toMatchObject({ status: "dead", attemptCount: 2 });
  });

  it("never resends an already-sent notification", async () => {
    const send = vi.fn().mockResolvedValue({ id: "email-4" });
    const submission = owner("10000000-0000-4000-8000-000000000005");
    const service = serviceWith({ send });
    await service.enqueueAndAttempt(submission);
    await service.retryDue();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("continues processing when one notification is broken", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await fixtureNotificationStore.ensure(owner("10000000-0000-4000-8000-000000000006"));
    await fixtureNotificationStore.ensure(owner("10000000-0000-4000-8000-000000000007"));
    const send = vi.fn().mockRejectedValueOnce(new Error("first failed")).mockResolvedValueOnce({ id: "email-5" });
    const result = await serviceWith({ send }).retryDue();
    expect(result).toMatchObject({ claimed: 2, sent: 1, failed: 1 });
    expect(getFixtureNotifications().map((record) => record.status)).toEqual(["failed", "sent"]);
  });

  it("routes every active form to Ray while preserving the visitor Reply-To and form details", async () => {
    const send = vi.fn().mockResolvedValue({ id: "email-routed" });
    const service = serviceWith({ send });
    const forms: Array<[FormKind, Record<string, unknown>]> = [
      ["owner-lead" as const, { name: "Ray DeLuca", email: "ray@example.com", listingUrl: "https://example.com/home", notes: "Owner route marker", consent: true, website: "" }],
      ["contact" as const, { name: "Guest One", email: "guest@example.com", inquiryType: "general", message: "Contact route marker question", consent: true, website: "" }],
      ["membership" as const, { name: "Member One", email: "member@example.com", travelInterests: "Membership route marker", consent: true, website: "" }],
      ["design-inquiry" as const, { name: "Owner One", email: "interiors@example.com", projectType: "interior-design", message: "Interiors route marker question", consent: true, website: "" }],
    ];
    for (const [kind, body] of forms) await expect(submitForm(kind, body, fixtureSubmissionStore, service)).resolves.toMatchObject({ ok: true });
    expect(getFixtureSubmissions()).toHaveLength(4);
    expect(send).toHaveBeenCalledTimes(4);
    for (const submission of getFixtureSubmissions()) {
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: "ray@utopiahomes.com", replyTo: submission.email, subject: expect.stringContaining(submission.name), text: expect.stringContaining(submission.id) }), expect.objectContaining({ idempotencyKey: notificationIdempotencyKey(submission.id) }));
    }
  });
});
