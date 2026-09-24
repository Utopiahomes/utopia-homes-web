export type PropertyStatus = "draft" | "active" | "hidden" | "archived";

export interface ContentImage {
  src: string;
  alt: string;
  category?: "arrival" | "outdoors" | "kitchen-dining" | "gathering" | "entertainment" | "bedrooms" | "bathrooms" | "details";
}

export interface AmenityGroup {
  name: string;
  amenities: string[];
}

export interface DesignerNote {
  designer: string;
  role: string;
  headline: string;
  paragraphs: string[];
  status: "approved" | "pending";
}

export interface PropertyReviewSummary {
  rating: number;
  count: number;
  sourceLabel: string;
  sourceUrl: string;
  lastVerifiedAt: string;
  editorialNote: string;
  highlights: string[];
}

export type BookingProvider = "uplisting" | "airbnb" | "vrbo" | "other";

export interface BookingDestination {
  provider: BookingProvider;
  url: string;
}

export interface PropertyBookingConfiguration {
  mode: "primary" | "fallback";
  primary?: BookingDestination;
  fallback: BookingDestination;
}

export interface PropertyExternalProfiles {
  airbnb?: { url: string };
  vrbo?: { url: string };
}

export interface Property {
  id: string;
  name: string;
  slug: string;
  status: PropertyStatus;
  featured: boolean;
  destinationId: string;
  city: string;
  state: string;
  propertyType: string;
  shortDescription: string;
  fullDescription: string;
  heroImage: ContentImage;
  gallery: ContentImage[];
  maxGuests?: number;
  bedrooms?: number;
  beds?: number;
  bathrooms?: number;
  amenities: AmenityGroup[];
  uniqueFeatures: string[];
  designerNote: DesignerNote;
  reviewSummary?: PropertyReviewSummary;
  petPolicy: string;
  parking: string;
  accessibility: string;
  booking: PropertyBookingConfiguration;
  profiles?: PropertyExternalProfiles;
  sourceUrls: string[];
  sourceSnapshot: {
    listingTitle: string;
    locationLabel: string;
    displayedCapacity: string;
    statedSleeps?: number;
    disclosedAmenityCount?: number;
    factualSummary: string;
  };
  sourceAudit: { lastCheckedAt?: string; factStatus: "verified" | "partial" | "pending"; photographyRights: "approved" | "pending" | "denied"; reviewRights: "approved" | "pending" | "denied"; notes: string[] };
  seoTitle: string;
  seoDescription: string;
}

export interface Destination {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  shortDescription: string;
  longDescription: string;
  heroImage: ContentImage;
  featured: boolean;
  seasonStory: { eyebrow: string; headline: string; description: string };
  highlights: Array<{ eyebrow: string; title: string; description: string; image: ContentImage }>;
  seoTitle: string;
  seoDescription: string;
}

export interface Review { id: string; propertyId?: string; author: string; quote: string; rating?: number; source: string; permissionStatus: "approved" | "pending" | "denied"; }
export interface FAQ { id: string; category: "stays" | "owners" | "membership" | "design" | "general"; question: string; answer: string; sortOrder: number; }
export interface Campaign { id: string; slug: string; name: string; partner: string; eyebrow: string; headline: string; description: string; heroImage: ContentImage; ctaLabel: string; ctaUrl: string; rulesUrl?: string; active: boolean; seoTitle: string; seoDescription: string; }
export interface LeadershipProfile { id: string; name: string; role: string; summary: string; initials: string; approvalStatus: "approved" | "placeholder"; editorialNotes: string[]; }

export interface PublicLucyFaqEntry {
  question: string;
  answer: string;
  source: string;
}

export interface PublicLucyContent {
  publicationStatus: "candidate" | "approved";
  intro: string;
  suggestions: string[];
  faqs: PublicLucyFaqEntry[];
}

export type DesignAudience = "rental" | "personal";
export type DesignServiceId = "rental_readiness_audit" | "room_design_plan" | "whole_home_design_plan" | "renovation_design_plan" | "turnkey_furnishing";
export interface DesignAudienceContent {
  eyebrow: string;
  headline: string;
  supportingCopy: string;
  primaryCta: string;
  heroImage: ContentImage;
  values: Array<{ title: string; description: string }>;
  outcomes: Array<{ title: string; description: string; serviceId: DesignServiceId }>;
  caseStudy: {
    eyebrow: string;
    headline: string;
    body: string;
    facts: string[];
    primaryImage: ContentImage;
    primaryLabel: string;
    secondaryImage: ContentImage;
    secondaryLabel: string;
  };
  quoteCta: string;
}
export interface DesignPageContent {
  audiences: Record<DesignAudience, DesignAudienceContent>;
  meghan: { heading: string; statement: string; supportingCopy: string; principles: string[] };
}

export interface Attribution { source?: string; referrer?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string; utmContent?: string; utmTerm?: string; }
export interface SubmissionBase extends Attribution { id: string; submittedAt: string; consent: boolean; }
export interface OwnerLead extends SubmissionBase { kind: "owner-lead"; name: string; email: string; phone?: string; propertyAddress?: string; cityState?: string; propertyType?: string; bedrooms?: number; currentRentalStatus?: string; listingUrl?: string; notes?: string; }
export interface MembershipSignup extends SubmissionBase { kind: "membership"; name: string; email: string; zip?: string; travelInterests?: string; }
export interface ContactRequest extends SubmissionBase { kind: "contact"; name: string; email: string; phone?: string; inquiryType: "guest" | "owner" | "general" | "design"; message: string; }
export interface PropertyEnhancementInquiry extends SubmissionBase { kind: "design-inquiry"; name: string; email: string; phone?: string; propertyAddress?: string; projectType: string; message: string; sourceQuoteId?: string; }
export type Submission = OwnerLead | MembershipSignup | ContactRequest | PropertyEnhancementInquiry;
