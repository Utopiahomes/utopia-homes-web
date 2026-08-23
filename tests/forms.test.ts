import { beforeEach, describe, expect, it } from "vitest";
import { clearFixtureSubmissions, getFixtureSubmissions } from "@/lib/submissions/fixture";
import { submitForm } from "@/lib/forms/submit";
describe("form validation and submission", () => {
  beforeEach(() => clearFixtureSubmissions());
  it("rejects invalid contact data", async () => { const result = await submitForm("contact", { name: "R", email: "bad", inquiryType: "general", message: "short", consent: true, website: "" }); expect(result.ok).toBe(false); expect(result.status).toBe(400); });
  it("stores a valid owner lead through the abstraction", async () => { const result = await submitForm("owner-lead", { name: "Ray DeLuca", email: "ray@example.com", phone: "555-555-1212", propertyAddress: "123 Ocean Avenue", cityState: "Wildwood, NJ", propertyType: "House", currentRentalStatus: "active", consent: true, website: "", utmCampaign: "owner-test" }); expect(result.ok).toBe(true); expect(getFixtureSubmissions()).toHaveLength(1); expect(getFixtureSubmissions()[0]).toMatchObject({ kind: "owner-lead", utmCampaign: "owner-test" }); });
  it("deduplicates membership email", async () => { const input = { name: "Ray DeLuca", email: "ray@example.com", consent: true, website: "" }; await submitForm("membership", input); const duplicate = await submitForm("membership", input); expect(duplicate.ok).toBe(true); expect(duplicate.duplicate).toBe(true); expect(getFixtureSubmissions()).toHaveLength(1); });
});
