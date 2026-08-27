import type { DesignPageContent } from "@/types/content";

export const designPageContent: DesignPageContent = {
  audiences: {
    rental: {
      eyebrow: "Design for memorable stays",
      headline: "Spaces guests remember. Homes that earn their keep.",
      supportingCopy: "We create distinctive rental interiors that photograph beautifully, stand up to real guests, and make the entire property feel worth choosing.",
      primaryCta: "Improve My Rental",
      heroImage: { src: "/images/shamrock/gallery/20.webp", alt: "Finished open-plan living and dining room at The Shamrock" },
      values: [
        { title: "Photographs beautifully", description: "Creates the instant visual confidence that earns the click." },
        { title: "Works for real guests", description: "Durable choices, intuitive spaces, and fewer operational headaches." },
        { title: "Feels worth booking", description: "Memorable details that support reviews, repeat stays, and rate." },
      ],
      outcomes: [
        { title: "Improve an Existing Rental", description: "Identify the design and guest-experience changes with the greatest potential.", serviceId: "rental_readiness_audit" },
        { title: "Furnish an Empty Rental", description: "Move from empty rooms to a complete, distinctive, guest-ready property.", serviceId: "turnkey_furnishing" },
        { title: "Plan a Rental Renovation", description: "Make design decisions before construction begins and costs lock in.", serviceId: "renovation_design_plan" },
      ],
      caseStudy: {
        eyebrow: "A real-world transformation",
        headline: "From historic rooms to a guest-ready destination.",
        body: "The Shamrock called for a design language big enough for milestone groups and careful enough to preserve a Wildwood original. Meghan balanced expressive rooms with durable choices, generous gathering spaces, and a character guests could remember.",
        facts: ["10 bedrooms", "Up to 32 guests", "Historic Wildwood home", "Whole-property design"],
        primaryImage: { src: "/images/shamrock/gallery/16.webp", alt: "Finished Shamrock gathering room with a generous sectional and historic wall display" },
        primaryLabel: "After · A finished gathering room",
        secondaryImage: { src: "/images/shamrock/gallery/01.webp", alt: "Historic Shamrock exterior before its transformation into a large-group stay" },
        secondaryLabel: "Before · The historic Shamrock",
      },
      quoteCta: "Evaluate My Rental",
    },
    personal: {
      eyebrow: "Design for the life you live",
      headline: "A home that feels unmistakably yours.",
      supportingCopy: "We shape beautiful, comfortable rooms around your routines, your taste, and the way you want your home to feel every day.",
      primaryCta: "Design My Home",
      heroImage: { src: "/images/buttercup/38.webp", alt: "Warm living room layered with a cream sectional, patterned rug, wood floors, and greenery" },
      values: [
        { title: "Personal to you", description: "A point of view drawn from your taste, routines, and story." },
        { title: "Beautiful in real life", description: "Comfort and function matter as much as the photograph." },
        { title: "Cohesive over time", description: "A plan that helps every room belong to the same home." },
      ],
      outcomes: [
        { title: "Transform a Room", description: "Give one important space a complete identity, layout, and design direction.", serviceId: "room_design_plan" },
        { title: "Design My Whole Home", description: "Bring every room together around one personal design language.", serviceId: "whole_home_design_plan" },
        { title: "Plan a Renovation or New Home", description: "See the finished direction before construction decisions lock in.", serviceId: "renovation_design_plan" },
      ],
      caseStudy: {
        eyebrow: "A home brought together",
        headline: "One point of view, carried from room to room.",
        body: "Our hospitality work begins with the same questions that shape a personal home: who lives here, how should it feel, and what needs to work every day? This Utopia property demonstrates that approach without presenting a rental as a private residence.",
        facts: ["Comfort-led planning", "Existing character retained", "Cohesive room stories", "Real-life durability"],
        primaryImage: { src: "/images/buttercup/31.webp", alt: "Comfortable living room with coordinated neutral seating and a patterned area rug" },
        primaryLabel: "Living room · Comfort and connection",
        secondaryImage: { src: "/images/buttercup/18.webp", alt: "Coordinated kitchen with white cabinetry, warm wood floors, and a generous island" },
        secondaryLabel: "Kitchen · The same point of view",
      },
      quoteCta: "Build My Home Profile",
    },
  },
  meghan: {
    heading: "Technology prepares the canvas. Meghan makes it yours.",
    statement: "A beautiful space should feel considered without feeling untouchable.",
    supportingCopy: "The Quote Studio organizes the property details, preferences, and inspiration. Meghan brings the judgment and design eye that turn those facts into a place with character.",
    principles: ["Comfort with character", "Beauty that works", "Every room belongs"],
  },
};
