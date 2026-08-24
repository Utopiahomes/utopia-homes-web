import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearFixtureSubmissions, getFixtureSubmissions } from "@/lib/submissions/fixture";
import { submitForm } from "@/lib/forms/submit";
import type { SubmissionStore } from "@/lib/submissions/types";
describe("form validation and submission", () => {
  beforeEach(() => clearFixtureSubmissions());
  it("rejects invalid contact data without touching storage", async () => { const store: SubmissionStore = { create: vi.fn(), findMembershipByEmail: vi.fn() }; const result = await submitForm("contact", { name: "R", email: "bad", inquiryType: "general", message: "short", consent: true, website: "" }, store); expect(result.ok).toBe(false); expect(result.status).toBe(400); expect(store.create).not.toHaveBeenCalled(); expect(store.findMembershipByEmail).not.toHaveBeenCalled(); });
  it("stores a valid owner lead through the abstraction", async () => { const result = await submitForm("owner-lead", { name: "Ray DeLuca", email: "ray@example.com", phone: "555-555-1212", propertyAddress: "123 Ocean Avenue", cityState: "Wildwood, NJ", propertyType: "House", currentRentalStatus: "active", consent: true, website: "", utmCampaign: "owner-test" }); expect(result.ok).toBe(true); expect(getFixtureSubmissions()).toHaveLength(1); expect(getFixtureSubmissions()[0]).toMatchObject({ kind: "owner-lead", utmCampaign: "owner-test" }); });
  it("accepts a low-friction owner lead from a listing URL", async () => { const result = await submitForm("owner-lead", { name: "Shore Owner", email: "owner@example.com", listingUrl: "https://www.airbnb.com/rooms/123456", consent: true, website: "" }); expect(result.ok).toBe(true); expect(getFixtureSubmissions()[0]).toMatchObject({ kind: "owner-lead", listingUrl: "https://www.airbnb.com/rooms/123456" }); });
  it("deduplicates membership email", async () => { const input = { name: "Ray DeLuca", email: "ray@example.com", consent: true, website: "" }; await submitForm("membership", input); const duplicate = await submitForm("membership", input); expect(duplicate).toMatchObject({ ok: true, duplicate: true }); expect(getFixtureSubmissions()).toHaveLength(1); });
  it("returns a retryable error when durable storage fails", async () => {
    const store: SubmissionStore = { create: vi.fn().mockRejectedValue(new Error("offline")), findMembershipByEmail: vi.fn().mockResolvedValue(null) };
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const result = await submitForm("contact", { name: "Ray DeLuca", email: "RAY@example.com", inquiryType: "general", message: "Please get in touch about Utopia.", consent: true, website: "" }, store);
    expect(result).toMatchObject({ ok: false, status: 503 });
  });
});
