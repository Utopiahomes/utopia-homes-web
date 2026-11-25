import type { BusinessProfile, Property, StayGuide } from "../types/content";
import { dogsLabel, parkingLabel, stayFacts } from "./stay-facts";

interface LlmsTxtInput {
  profile: BusinessProfile;
  properties: Property[];
  guides: StayGuide[];
  origin: string;
}

function homeLine(property: Property, origin: string): string {
  const facts = stayFacts(property);
  const rating = property.sourceAudit.reviewRights === "approved" ? property.reviewSummary : undefined;
  const details = [
    `${facts.city}, ${property.state}`,
    `sleeps up to ${facts.guests} guests`,
    `${facts.bedrooms} bedrooms, ${facts.beds} beds, ${facts.bathrooms} baths`,
    facts.pool ?? "no pool",
    facts.hotTub ?? "no hot tub",
    facts.fencedYard,
    `parking for ${parkingLabel(facts)}`,
    dogsLabel(facts),
    rating ? `rated ${rating.rating.toFixed(2)} out of 5 from ${rating.count} reviews on ${rating.sourceLabel} as of ${rating.lastVerifiedAt}` : null,
  ].filter(Boolean);
  return `- [${property.name}](${origin}/stays/${property.slug}): ${details.join("; ")}.`;
}

/**
 * The plain-text summary at /llms.txt, written from the same records as the pages so it can't drift.
 * It states only what the site publishes: no street address, phone number, or legal entity.
 */
export function buildLlmsTxt({ profile, properties, guides, origin }: LlmsTxtInput): string {
  const service = (item: BusinessProfile["management"]) => `- [${item.name}](${origin}${item.path}): ${item.summary} Includes: ${item.includes.join("; ")}.`;
  return [
    `# ${profile.name}`,
    "",
    `> ${profile.description}`,
    "",
    `Area served: ${profile.areaServedName}. Booking direct with ${profile.name} is 10% cheaper than Airbnb.`,
    "",
    "## Homes",
    "",
    ...properties.map((property) => homeLine(property, origin)),
    "",
    "## Guides",
    "",
    ...guides.map((guide) => `- [${guide.seoTitle}](${origin}/stays/${guide.slug}): ${guide.answer}`),
    "",
    "## Services",
    "",
    service(profile.management),
    service(profile.design),
    "",
    "## Key pages",
    "",
    `- [All stays](${origin}/stays): Search dates and see each home's price.`,
    `- [Frequently asked questions](${origin}/faq): Booking, dogs, pools, parking, management, and design.`,
    `- [About](${origin}/about): Ray and Meghan DeLuca, the owners of ${profile.name}.`,
    `- [Contact](${origin}/contact): Contact form for stays, property management, design, or general questions.`,
    "",
  ].join("\n");
}
