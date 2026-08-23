import { describe, expect, it } from "vitest";
import { destinations, properties, reviews } from "@/content";
describe("version-controlled content", () => {
  it("keeps every active property normalized and source-auditable", () => { for (const property of properties.filter((record) => record.status === "active")) { expect(property.id).toBeTruthy(); expect(property.destinationId).toBeTruthy(); expect(property.sourceUrls.length).toBeGreaterThan(0); expect(property.bookingUrl).toMatch(/^https:/); expect(property.heroImage.alt).toBeTruthy(); expect(property.petPolicy).toBeTruthy(); expect(property.parking).toBeTruthy(); expect(property.accessibility).toBeTruthy(); } });
  it("keeps relationships valid and unapproved reviews unpublished", () => { expect(properties.every((property) => destinations.some((destination) => destination.id === property.destinationId))).toBe(true); expect(reviews.filter((review) => review.permissionStatus !== "approved")).toHaveLength(0); });
});
