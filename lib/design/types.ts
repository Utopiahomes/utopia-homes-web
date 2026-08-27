import type { DesignAudience, DesignServiceId } from "@/types/content";

export type DesignGrade = "rental" | "elegant" | "utopian";
export type DesignComplexity = "standard" | "elevated" | "custom";
export type DesignLevel = "rental_focused" | "elegant" | "utopian";
export type RenovationSeverity = "cosmetic" | "moderate" | "major";
export type WalkthroughType = "none" | "local" | "regional";
export type AppliancePackage = "none" | "basic" | "enhanced" | "premium";
export type DesignOption = "visualization" | "additional_direction" | "onsite_walkthrough" | "rush" | "outdoor_design" | "additional_revision";
export type ManualReviewReason = "TURNKEY_MARGIN_BELOW_TARGET" | "CUSTOM_COMPLEXITY" | "STRUCTURAL_SCOPE" | "LARGE_PROPERTY" | "LARGE_QUOTE" | "RUSH_REQUEST" | "INCOMPLETE_MEDIA" | "UTOPIAN_TURNKEY" | "ROOM_SCOPE_TOO_LARGE";
export type RoomType = "bedroom" | "living_room" | "dining_room" | "home_office" | "kitchen" | "full_bathroom" | "half_bathroom" | "open_concept" | "specialty_room" | "outdoor_room";

export interface QuoteInput {
  audience: DesignAudience;
  serviceId: DesignServiceId;
  property: { address?: string; listingUrl?: string; propertyType: string; livingArea: number; bedrooms: number; bathrooms: number; guestCapacity: number; };
  scope: {
    roomCount: number; roomQuantities?: Partial<Record<RoomType, number>>; affectedArea: number; declaredConstructionBudget?: number;
    kitchenIncluded: boolean; kitchens?: number; fullBathrooms?: number; halfBathrooms?: number;
    structuralChanges: boolean; structuralChangeConcepts?: number; specialtySpaces?: number; specialtySpaceSelections?: string[];
    outdoorIncluded: boolean; outdoorAffectedArea?: number; outdoorFurnishingZones?: number; structureCount?: number;
    complexity: DesignComplexity; designLevel?: DesignLevel; renovationSeverity?: RenovationSeverity; threeDRooms?: number;
    walkthrough?: WalkthroughType; merchandiseToProcure?: number; appliancePackage?: AppliancePackage; completeMedia?: boolean;
  };
  grade: DesignGrade;
  options: DesignOption[];
  informationCount: number;
  retentionNoticeVersion: string;
}

export interface QuoteLineItem { code: string; label: string; amount: number; }
export interface InternalPricingReview { contributionMargin: number; status: "pass" | "review"; }
export interface PreliminaryQuote {
  id: string; quoteNumber: string; audience: DesignAudience; serviceId: DesignServiceId; ruleSetVersion: string;
  lineItems: QuoteLineItem[]; rawTotal: number; subtotal: number; total: number; assumptions: string[]; exclusions: string[];
  manualReviewReasons: ManualReviewReason[]; internalPricingReview?: InternalPricingReview; completenessScore: number;
  generatedAt: string; expiresAt: string; status: "generated" | "acknowledged"; inputSnapshot: QuoteInput;
}

export interface AcknowledgedQuote extends PreliminaryQuote {
  status: "acknowledged"; customer: { name: string; email: string; phone?: string }; disclaimerVersion: string;
  acknowledgedAt: string; reopenTokenHash: string; modelImprovementConsent: boolean; modelImprovementConsentAt?: string;
}
