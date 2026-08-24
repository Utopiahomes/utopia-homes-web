import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseSubmissionStore } from "@/lib/submissions/supabase";
import type { MembershipSignup, OwnerLead } from "@/types/content";

function clientForInsert(result: unknown, capture: (row: unknown) => void) {
  return {
    from: vi.fn(() => ({
      insert: (row: unknown) => {
        capture(row);
        return { select: () => ({ single: async () => result }) };
      },
    })),
  } as unknown as SupabaseClient;
}

describe("Supabase submission store", () => {
  it("persists typed form fields and attribution in database columns", async () => {
    let inserted: unknown;
    const store = createSupabaseSubmissionStore({ client: clientForInsert({ data: { id: "lead-1" }, error: null }, (row) => { inserted = row; }) });
    const submission: OwnerLead = {
      id: "lead-1", kind: "owner-lead", submittedAt: "2026-08-23T20:00:00.000Z",
      name: "Ray DeLuca", email: "RAY@Example.com", consent: true, listingUrl: "https://example.com/home",
      utmSource: "instagram", utmCampaign: "owners", referrer: "https://instagram.com/",
    };
    const result = await store.create(submission);
    expect(result).toEqual({ id: "lead-1", duplicate: false });
    expect(inserted).toMatchObject({ id: "lead-1", kind: "owner-lead", status: "new", email: "ray@example.com", listing_url: "https://example.com/home", utm_source: "instagram", utm_campaign: "owners" });
  });

  it("treats a membership unique-index race as a safe duplicate", async () => {
    const store = createSupabaseSubmissionStore({ client: clientForInsert({ data: null, error: { code: "23505", message: "duplicate" } }, () => undefined) });
    const submission: MembershipSignup = { id: "member-1", kind: "membership", submittedAt: "2026-08-23T20:00:00.000Z", name: "Ray", email: "ray@example.com", consent: true };
    await expect(store.create(submission)).resolves.toEqual({ id: "member-1", duplicate: true });
  });

  it("surfaces non-duplicate storage errors", async () => {
    const store = createSupabaseSubmissionStore({ client: clientForInsert({ data: null, error: { code: "42501", message: "denied" } }, () => undefined) });
    const submission: MembershipSignup = { id: "member-2", kind: "membership", submittedAt: "2026-08-23T20:00:00.000Z", name: "Ray", email: "ray@example.com", consent: true };
    await expect(store.create(submission)).rejects.toThrow("42501");
  });
});
