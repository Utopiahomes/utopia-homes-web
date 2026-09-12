import { describe, expect, it } from "vitest";
import { publicLucyKnowledgeCandidate } from "@/content/lucy-knowledge";
import { properties } from "@/content/properties";
import {
  createPublicLucyKnowledgeSnapshot,
  digestPublicLucyKnowledgeSnapshot,
} from "@/lib/lucy/knowledge";

const EXPECTED_CANDIDATE_DIGEST = "95e2e20a9e4a3786e3daa63a73bb5ff2866b5bae295e6dc138bf432e4361c422";

describe("Public Lucy R1 knowledge candidate", () => {
  it("is review-only, bounded, effective-dated, and Utopia-linked", () => {
    expect(publicLucyKnowledgeCandidate.schema).toBe("lucy-public-knowledge-v1");
    expect(publicLucyKnowledgeCandidate.entries).toHaveLength(25);
    expect(publicLucyKnowledgeCandidate.entries.every((entry) => entry.effective_from === "2026-09-12T00:00:00Z")).toBe(true);
    expect(publicLucyKnowledgeCandidate.entries.every((entry) => new URL(entry.source.href).hostname === "www.utopiahomes.com")).toBe(true);
    expect(JSON.stringify(publicLucyKnowledgeCandidate)).not.toMatch(/airbnb|uplisting|lodgify|openrouter|lucy@|ray@/i);
  });

  it("keeps structured property facts aligned with canonical website content", () => {
    for (const property of properties) {
      const entries = publicLucyKnowledgeCandidate.entries.filter((entry) => entry.property_slug === property.slug);
      expect(entries.length).toBeGreaterThan(0);
      const expected = {
        max_guests: property.maxGuests,
        parking_spaces: Number(property.parking.match(/\d+/)?.[0]),
        has_pool: property.amenities.some((group) => group.amenities.some((amenity) => /pool/i.test(amenity))),
        has_hot_tub: property.amenities.some((group) => group.amenities.some((amenity) => /hot tub/i.test(amenity))),
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        pets_allowed: /welcome/i.test(property.petPolicy),
      };
      expect(entries.every((entry) => JSON.stringify(entry.property_facts) === JSON.stringify(expected))).toBe(true);
    }
  });

  it("matches Cloud Lucy's canonical R1 digest", () => {
    const snapshot = createPublicLucyKnowledgeSnapshot(publicLucyKnowledgeCandidate.entries);
    expect(digestPublicLucyKnowledgeSnapshot(snapshot)).toBe(EXPECTED_CANDIDATE_DIGEST);
  });
});
