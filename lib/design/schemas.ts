import { z } from "zod";

const boundedNumber = (maximum: number) => z.coerce.number().finite().min(0).max(maximum);
const optionalBounded = (maximum: number) => boundedNumber(maximum).optional();
const roomQuantity = z.partialRecord(z.enum(["bedroom", "living_room", "dining_room", "home_office", "kitchen", "full_bathroom", "half_bathroom", "open_concept", "specialty_room", "outdoor_room"]), boundedNumber(100)).optional();

export const quoteInputSchema = z.object({
  audience: z.enum(["rental", "personal"]),
  serviceId: z.enum(["rental_readiness_audit", "room_design_plan", "whole_home_design_plan", "renovation_design_plan", "turnkey_furnishing"]),
  property: z.object({
    address: z.string().trim().max(240).optional().or(z.literal("")), listingUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
    propertyType: z.string().trim().min(2).max(80), livingArea: boundedNumber(50_000), bedrooms: boundedNumber(100), bathrooms: boundedNumber(100), guestCapacity: boundedNumber(300),
  }),
  scope: z.object({
    roomCount: boundedNumber(100), roomQuantities: roomQuantity, affectedArea: boundedNumber(50_000), declaredConstructionBudget: optionalBounded(100_000_000),
    kitchenIncluded: z.boolean(), kitchens: optionalBounded(20), fullBathrooms: optionalBounded(50), halfBathrooms: optionalBounded(50),
    structuralChanges: z.boolean(), structuralChangeConcepts: optionalBounded(20), specialtySpaces: optionalBounded(50),
    outdoorIncluded: z.boolean(), outdoorAffectedArea: optionalBounded(50_000), outdoorFurnishingZones: optionalBounded(50), structureCount: optionalBounded(25),
    complexity: z.enum(["standard", "elevated", "custom"]), designLevel: z.enum(["rental_focused", "elegant", "utopian"]).optional(), renovationSeverity: z.enum(["cosmetic", "moderate", "major"]).optional(),
    threeDRooms: optionalBounded(100), walkthrough: z.enum(["none", "local", "regional"]).optional(), merchandiseToProcure: optionalBounded(10_000_000),
    appliancePackage: z.enum(["none", "basic", "enhanced", "premium"]).optional(), completeMedia: z.boolean().optional(),
  }),
  grade: z.enum(["rental", "elegant", "utopian"]),
  options: z.array(z.enum(["visualization", "additional_direction", "onsite_walkthrough", "rush", "outdoor_design", "additional_revision"])).max(6),
  informationCount: z.coerce.number().int().min(0).max(100), retentionAcknowledged: z.literal(true),
});

export const acknowledgeQuoteSchema = z.object({
  quoteId: z.string().uuid(), reopenToken: z.string().min(32).max(256), name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(160),
  phone: z.string().trim().min(7).max(40).optional().or(z.literal("")), acknowledged: z.literal(true), modelImprovementConsent: z.boolean().default(false), website: z.string().max(0).optional().or(z.literal("")),
});
