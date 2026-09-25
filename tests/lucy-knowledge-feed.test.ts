import { describe, expect, it } from "vitest";
import { GET } from "@/app/lucy-knowledge/properties.json/route";
import { properties } from "@/content/properties";
import { buildLucyKnowledgeFeed } from "@/lib/lucy/knowledge-feed";

describe("Lucy knowledge feed", () => {
  it("publishes every active property's page facts", async () => {
    const feed = await (await GET()).json();
    expect(feed.schema).toBe("utopia-homes-public-properties-v1");
    expect(feed.properties.map((p: { slug: string }) => p.slug)).toEqual(
      properties.filter((p) => p.status === "active").map((p) => p.slug),
    );
    expect(feed.properties[0]).toMatchObject({
      name: properties[0].name,
      max_guests: properties[0].maxGuests,
      parking: properties[0].parking,
      pet_policy: properties[0].petPolicy,
    });
  });

  it("leaves out internal audit notes and external booking links", () => {
    const text = JSON.stringify(buildLucyKnowledgeFeed(properties));
    expect(text).not.toMatch(/airbnb|sourceAudit|source_audit|approved by Ray|listingTitle/i);
  });

  it("skips properties that are not active", () => {
    const feed = buildLucyKnowledgeFeed([{ ...properties[0], status: "hidden" }, properties[1]]);
    expect(feed.properties.map((p) => p.slug)).toEqual([properties[1].slug]);
  });
});
