import { afterEach, describe, expect, it, vi } from "vitest";
import { robotsTxt } from "@/lib/robots-txt";
import { properties } from "@/content/properties";
import { jsonLdText, stayStructuredData } from "@/lib/structured-data";

const origin = "https://www.utopiahomes.com";
const stay = (slug: string) => {
  const property = properties.find((item) => item.slug === slug);
  if (!property) throw new Error(`missing ${slug}`);
  return property;
};
type Place = { numberOfBedrooms: number; petsAllowed: boolean; occupancy: { maxValue: number }; bed: { numberOfBeds: number }; additionalProperty: Array<{ name: string; value: unknown }> };

describe("stayStructuredData", () => {
  it("states the approved facts answer engines got wrong", () => {
    const data = stayStructuredData(stay("central-ave-socialization"), origin);
    const place = data.containsPlace as Place;
    expect(data["@type"]).toBe("VacationRental");
    expect(data.url).toBe(`${origin}/stays/central-ave-socialization`);
    expect(place.numberOfBedrooms).toBe(7);
    expect(place.occupancy.maxValue).toBe(22);
    expect(place.petsAllowed).toBe(true);
    expect(place.additionalProperty).toContainEqual({ "@type": "PropertyValue", name: "Bathrooms", value: 3.5 });
  });

  it("publishes the current Airbnb rating only when review rights are approved", () => {
    const property = stay("buttercup-beauty");
    expect(stayStructuredData(property, origin).aggregateRating).toEqual({ "@type": "AggregateRating", ratingValue: 4.95, reviewCount: 81, bestRating: 5 });
    const pending = { ...property, sourceAudit: { ...property.sourceAudit, reviewRights: "pending" as const } };
    expect(stayStructuredData(pending, origin)).not.toHaveProperty("aggregateRating");
  });

  it("gives every stay absolute images", () => {
    for (const property of properties) {
      const data = stayStructuredData(property, origin);
      expect((data.image as string[]).every((src) => src.startsWith(`${origin}/`))).toBe(true);
      expect((data.containsPlace as Place).petsAllowed).toBe(true);
    }
  });

  it("can't close its script tag early", () => {
    expect(jsonLdText({ name: "</script><b>" })).toBe('{"name":"\\u003c/script>\\u003cb>"}');
  });
});

describe("robots", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("lists the sitemap in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(robotsTxt(origin)).toBe(`User-Agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  });

  it("keeps previews out of search", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(robotsTxt(origin)).toBe("User-Agent: *\nDisallow: /\n");
  });
});
