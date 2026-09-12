import { describe, expect, it } from "vitest";
import { publicLucyContent } from "@/content";
import {
  canonicalizePublicLucySnapshot,
  createPublicLucySnapshot,
  digestPublicLucySnapshot,
} from "@/lib/lucy/snapshot";

const EXPECTED_CANDIDATE_DIGEST = "6232b5fa0b382346fba692f29e74d2b3fdbcd9a19ee960d2e609fd0b2ce2b99e";

describe("Public Lucy candidate content", () => {
  it("is a bounded, source-linked candidate with answerable suggestions", () => {
    expect(publicLucyContent.publicationStatus).toBe("approved");
    expect(publicLucyContent.faqs).toHaveLength(8);
    expect(publicLucyContent.suggestions).toHaveLength(4);

    const questions = new Set(publicLucyContent.faqs.map((faq) => faq.question));
    expect(publicLucyContent.suggestions.every((suggestion) => questions.has(suggestion))).toBe(true);
    expect(publicLucyContent.faqs.every((faq) => new URL(faq.source).hostname === "www.utopiahomes.com")).toBe(true);
    expect(JSON.stringify(publicLucyContent.faqs)).not.toMatch(/uplisting|lodgify|openrouter/i);
  });

  it("matches Cloud Lucy's stable canonical snapshot digest", () => {
    const snapshot = createPublicLucySnapshot(publicLucyContent.faqs);
    const reordered = createPublicLucySnapshot([...publicLucyContent.faqs].reverse());

    expect(canonicalizePublicLucySnapshot(reordered)).toBe(canonicalizePublicLucySnapshot(snapshot));
    expect(digestPublicLucySnapshot(snapshot)).toBe(EXPECTED_CANDIDATE_DIGEST);
  });
});
