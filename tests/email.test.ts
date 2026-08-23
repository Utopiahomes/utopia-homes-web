import { describe, expect, it } from "vitest";
import { sendSubmissionEmails } from "@/lib/email/submissions";
describe("transactional email", () => { it("is a safe no-op without server credentials", async () => { const result = await sendSubmissionEmails({ kind: "membership", id: "test", submittedAt: new Date(0).toISOString(), consent: true, name: "Ray", email: "ray@example.com" }); expect(result).toEqual({ notification: "skipped", confirmation: "skipped" }); }); });
