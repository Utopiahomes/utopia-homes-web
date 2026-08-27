import { beforeEach, describe, expect, it, vi } from "vitest";
import { acknowledgeDesignQuote, generateDesignQuote } from "@/lib/design/service";
import { clearMemoryDesignQuotes, memoryDesignQuoteStore } from "@/lib/design/store";

const input = { audience: "personal", serviceId: "room_design_plan", property: { address: "123 Ocean Avenue", listingUrl: "", propertyType: "House", livingArea: 1500, bedrooms: 3, bathrooms: 2, guestCapacity: 5 }, scope: { roomCount: 1, affectedArea: 400, kitchenIncluded: false, structuralChanges: false, outdoorIncluded: false, complexity: "standard" }, grade: "elegant", options: [], informationCount: 10, retentionAcknowledged: true };

describe("design quote service", () => {
  beforeEach(() => clearMemoryDesignQuotes());
  it("rejects malformed pricing input before storage", async () => { const store = { create: vi.fn(), acknowledge: vi.fn() }; const result = await generateDesignQuote({ audience: "unknown" }, store); expect(result.status).toBe(400); expect(store.create).not.toHaveBeenCalled(); });
  it("stores generated quotes and requires the matching opaque token to acknowledge", async () => {
    const generated = await generateDesignQuote(input, memoryDesignQuoteStore); expect(generated.ok).toBe(true); if (!generated.ok) return;
    const denied = await acknowledgeDesignQuote({ quoteId: generated.quote.id, reopenToken: "x".repeat(40), name: "Ray DeLuca", email: "ray@example.com", acknowledged: true, website: "" }, memoryDesignQuoteStore); expect(denied.status).toBe(404);
    const accepted = await acknowledgeDesignQuote({ quoteId: generated.quote.id, reopenToken: generated.reopenToken, name: "Ray DeLuca", email: "RAY@example.com", acknowledged: true, modelImprovementConsent: true, website: "" }, memoryDesignQuoteStore); expect(accepted).toMatchObject({ ok: true, quote: { status: "acknowledged", customer: { email: "ray@example.com" }, modelImprovementConsent: true } });
  });
});
