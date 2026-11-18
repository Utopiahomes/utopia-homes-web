import type { BusinessProfile } from "@/types/content";

export const siteContent = { name: "Utopia Homes", defaultTitle: "Utopia Homes", description: "Distinctive destination homes, thoughtfully managed.", contactEmail: "ray@utopiahomes.com", ownerEmail: "ray@utopiahomes.com" } as const;

/**
 * What Utopia Homes does, in plain words, for the owner page, structured data, and llms.txt. Every
 * line restates copy already approved on /list-your-home and /design.
 */
export const businessProfile: BusinessProfile = {
  name: siteContent.name,
  description: "Utopia Homes hosts large-group vacation homes in the Wildwoods, New Jersey, manages vacation rentals for homeowners, and designs and furnishes vacation rentals through Utopia Design.",
  areaServedName: "The Wildwoods, New Jersey",
  shareImage: { src: "/images/buttercup/01.webp", alt: "Front exterior and welcoming entrance of Buttercup Beauty" },
  management: {
    name: "Vacation rental management",
    path: "/list-your-home",
    summary: "Utopia Homes manages vacation rentals in the Wildwoods, New Jersey. We own and host vacation homes here ourselves, and we take on the work of running a rental so your home performs without consuming your time.",
    includes: [
      "Pricing, distribution, direct marketing, and positioning",
      "Guest communication, cleaning, maintenance, and issue resolution",
      "Local property oversight and trusted contractors",
      "Furnishing, amenities, and photography through Utopia Design",
    ],
  },
  design: {
    name: "Vacation rental design and furnishing",
    path: "/design",
    summary: "Utopia Design, a Utopia Homes company, designs and furnishes vacation rentals and designs personal homes.",
    includes: [
      "Improving an existing rental",
      "Furnishing an empty rental until it is complete and guest-ready",
      "Planning a rental renovation",
    ],
  },
};
