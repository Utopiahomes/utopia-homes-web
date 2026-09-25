import type { Property } from "@/types/content";

/**
 * The public property facts Lucy's knowledge is built from. Homes Prime reads this feed and turns it
 * into a knowledge release for Ray to approve, so a change to a property here reaches Lucy without
 * anyone retyping it.
 *
 * Only facts a guest already sees on the property page belong here. Source audits, listing
 * snapshots, and external booking URLs stay out.
 */
export const LUCY_KNOWLEDGE_FEED_SCHEMA = "utopia-homes-public-properties-v1" as const;

export function buildLucyKnowledgeFeed(properties: Property[]) {
  return {
    schema: LUCY_KNOWLEDGE_FEED_SCHEMA,
    properties: properties
      .filter((property) => property.status === "active")
      .map((property) => ({
        slug: property.slug,
        name: property.name,
        city: property.city,
        state: property.state,
        short_description: property.shortDescription,
        full_description: property.fullDescription,
        max_guests: property.maxGuests ?? null,
        bedrooms: property.bedrooms ?? null,
        beds: property.beds ?? null,
        bathrooms: property.bathrooms ?? null,
        amenities: property.amenities.map((group) => ({ name: group.name, amenities: group.amenities })),
        unique_features: property.uniqueFeatures,
        pet_policy: property.petPolicy,
        parking: property.parking,
        accessibility: property.accessibility,
      })),
  };
}
