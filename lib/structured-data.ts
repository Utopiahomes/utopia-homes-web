import { siteContent } from "@/content/site";
import type { Property } from "@/types/content";

type JsonLd = Record<string, unknown>;

const detail = (name: string, value: string | number): JsonLd => ({ "@type": "PropertyValue", name, value });

/**
 * What a stay page states about the home, in the form search and answer engines read directly.
 *
 * Ray, 2026-11-18: the first AEO scorecard found answer engines saying Central Ave Socialization
 * bans dogs and has 4 bedrooms, and Buttercup Beauty has 5. These facts come from the same approved
 * property records the page shows, so the two can't disagree.
 *
 * Guest ratings appear only for records whose source audit approves publishing reviews (Ray
 * confirmed the right for the Airbnb reviews on 2026-11-18). Bathrooms are a named detail because
 * schema.org's bathroom count must be a whole number and these homes have half baths.
 */
export function stayStructuredData(property: Property, origin: string): JsonLd {
  const url = `${origin}/stays/${property.slug}`;
  const details = [
    property.bathrooms !== undefined ? detail("Bathrooms", property.bathrooms) : null,
    detail("Pet policy", property.petPolicy),
    detail("Parking", property.parking),
    detail("Accessibility", property.accessibility),
  ].filter(Boolean);
  const ratings = property.sourceAudit.reviewRights === "approved" ? property.reviewSummary : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    "@id": `${url}#rental`,
    name: property.name,
    url,
    description: property.fullDescription,
    image: property.gallery.slice(0, 8).map((image) => new URL(image.src, origin).href),
    address: { "@type": "PostalAddress", addressLocality: property.city, addressRegion: property.state, addressCountry: "US" },
    brand: { "@type": "Organization", name: siteContent.name, url: origin },
    ...(ratings && { aggregateRating: { "@type": "AggregateRating", ratingValue: ratings.rating, reviewCount: ratings.count, bestRating: 5 } }),
    containsPlace: {
      "@type": "Accommodation",
      additionalType: property.propertyType,
      ...(property.maxGuests !== undefined && { occupancy: { "@type": "QuantitativeValue", maxValue: property.maxGuests, unitText: "guests" } }),
      ...(property.bedrooms !== undefined && { numberOfBedrooms: property.bedrooms }),
      ...(property.beds !== undefined && { bed: { "@type": "BedDetails", numberOfBeds: property.beds } }),
      petsAllowed: /\bdogs?\b[^.]*\bwelcome\b/i.test(property.petPolicy),
      amenityFeature: property.amenities.flatMap((group) => group.amenities).map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
      additionalProperty: details,
    },
  };
}

/** Safe inside a script tag: a "<" in the copy can't close the tag early. */
export function jsonLdText(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
