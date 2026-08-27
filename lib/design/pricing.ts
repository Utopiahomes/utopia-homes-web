import { randomBytes, randomUUID } from "node:crypto";
import type { DesignGrade, ManualReviewReason, PreliminaryQuote, QuoteInput, QuoteLineItem, RoomType } from "./types";

export const DESIGN_PRICING_RULE_VERSION = "UD-2026.2";
export const DESIGN_ESTIMATE_DISCLAIMER_VERSION = "2026-08-27.v2";

const ROUNDING_INCREMENT = 25;
const complexityMultiplier = { standard: 1, elevated: 1.15, custom: 1.3 } as const;
const roomRates: Record<RoomType, [string, number]> = {
  bedroom: ["Bedroom", 995], living_room: ["Living room", 1495], dining_room: ["Dining room", 995], home_office: ["Home office", 895],
  kitchen: ["Kitchen design", 1995], full_bathroom: ["Full bathroom", 1495], half_bathroom: ["Half bathroom", 895], open_concept: ["Open-concept area", 2495],
  specialty_room: ["Game / specialty room", 1795], outdoor_room: ["Outdoor room", 1495],
};
const wholeHome = { rental_focused: ["Rental-Focused", 4, 4500], elegant: ["Elegant", 5, 5500], utopian: ["Utopian", 6, 7000] } as const;
const renovation = { cosmetic: ["Cosmetic", 5, 3500, .06], moderate: ["Moderate", 7.5, 6000, .08], major: ["Major", 10, 9000, .1] } as const;
const turnkey = {
  rental: ["Rental", 35, 22500, 650, 2500, 3500, .55, 70], elegant: ["Elegant", 45, 30000, 850, 4000, 6000, .58, 95], utopian: ["Utopian", 55, 37500, 1100, 6000, 10000, .6, 130],
} as const;
const appliances = { none: 0, basic: 4000, enhanced: 8000, premium: 15000 } as const;

export function priceDesignProject(input: QuoteInput, now = new Date()): PreliminaryQuote {
  const lines: QuoteLineItem[] = [];
  const reviews = new Set<ManualReviewReason>();
  const add = (code: string, label: string, amount: number) => { const normalized = cents(amount); if (normalized) lines.push({ code, label, amount: normalized }); };
  const p = input.property;
  const s = input.scope;
  const multiplier = complexityMultiplier[s.complexity];
  const options = new Set(input.options);
  const threeDRooms = s.threeDRooms ?? (options.has("visualization") ? 1 : 0);
  const walkthrough = s.walkthrough ?? (options.has("onsite_walkthrough") ? "regional" : "none");
  const rush = options.has("rush");
  let internalPricingReview: PreliminaryQuote["internalPricingReview"];

  if (input.serviceId === "rental_readiness_audit") {
    add("audit-base", "Rental readiness audit", 595);
    add("audit-area", "Living-area addition", Math.ceil(Math.max(p.livingArea - 1500, 0) / 1000) * 125);
    add("audit-bedrooms", "Bedroom addition", Math.max(p.bedrooms - 3, 0) * 75);
    add("audit-bathrooms", "Bathroom addition", Math.max(p.bathrooms - 2, 0) * 50);
    add("audit-guests", "Guest-capacity addition", Math.max(p.guestCapacity - 8, 0) * 25);
    add("audit-specialty", "Specialty-space addition", (s.specialtySpaces ?? 0) * 150);
    capLineItems(lines, 1495);
  }

  if (input.serviceId === "room_design_plan") {
    const quantities = s.roomQuantities && Object.keys(s.roomQuantities).length ? s.roomQuantities : { bedroom: Math.max(1, s.roomCount) };
    let roomBase = 0;
    let roomCount = 0;
    for (const [roomType, [label, rate]] of Object.entries(roomRates) as Array<[RoomType, [string, number]]>) {
      const quantity = quantities[roomType] ?? 0;
      roomCount += quantity;
      roomBase += rate * quantity;
      add(`room-${roomType}`, `${label}${quantity === 1 ? "" : ` × ${quantity}`}`, rate * quantity);
    }
    if (roomBase < 895) add("room-minimum", "Room-plan minimum adjustment", 895 - roomBase);
    const normalizedBase = Math.max(roomBase, 895);
    add("complexity", `${capitalize(s.complexity)} complexity`, normalizedBase * (multiplier - 1));
    addDesignOptions(lines, normalizedBase * multiplier, s, options, threeDRooms, walkthrough, rush);
    if (roomCount >= 5) reviews.add("ROOM_SCOPE_TOO_LARGE");
  }

  if (input.serviceId === "whole_home_design_plan") {
    const level = s.designLevel ?? gradeToLevel(input.grade);
    const [label, rate, minimum] = wholeHome[level];
    const base = Math.max(p.livingArea * rate, minimum);
    add("whole-home-base", `${label} whole-home design`, base);
    add("complexity", `${capitalize(s.complexity)} complexity`, base * (multiplier - 1));
    add("additional-structures", "Additional structures", Math.max((s.structureCount ?? 1) - 1, 0) * 750);
    addDesignOptions(lines, base * multiplier, s, options, threeDRooms, walkthrough, rush);
    if (p.livingArea > 5000 || (s.structureCount ?? 1) > 2) reviews.add("LARGE_PROPERTY");
  }

  if (input.serviceId === "renovation_design_plan") {
    const severity = s.renovationSeverity ?? "moderate";
    const [label, rate, minimum, budgetRate] = renovation[severity];
    const areaFee = Math.max(s.affectedArea * rate, minimum, (s.declaredConstructionBudget ?? 0) * budgetRate);
    add("renovation-base", `${label} renovation design`, areaFee);
    add("renovation-kitchen", "Kitchen premium", (s.kitchens ?? (s.kitchenIncluded ? 1 : 0)) * 2000);
    add("renovation-full-bath", "Full-bath premium", (s.fullBathrooms ?? 0) * 1250);
    add("renovation-half-bath", "Half-bath premium", (s.halfBathrooms ?? 0) * 750);
    add("renovation-structural", "Structural-concept premium", (s.structuralChangeConcepts ?? (s.structuralChanges ? 1 : 0)) * 2500);
    add("renovation-specialty", "Specialty / millwork premium", (s.specialtySpaces ?? 0) * 1000);
    if ((s.outdoorAffectedArea ?? 0) > 0) add("outdoor-design", "Outdoor-space design", Math.max((s.outdoorAffectedArea ?? 0) * 2.5, 1250));
    const scopeSubtotal = sum(lines);
    add("complexity", `${capitalize(s.complexity)} complexity`, scopeSubtotal * (multiplier - 1));
    const adjustedDesignFee = scopeSubtotal * multiplier;
    add("3d-visualization", `3D visualization${threeDRooms === 1 ? "" : ` × ${threeDRooms}`}`, threeDRooms * 495);
    if (rush) add("rush", "Rush delivery", Math.max(adjustedDesignFee * .25, 750));
    if (severity === "major" || s.affectedArea > 3000) reviews.add("STRUCTURAL_SCOPE");
  }

  if (input.serviceId === "turnkey_furnishing") {
    const [label, rate, minimum, extraGuest, specialty, outdoor, allocation, hoursPerThousand] = turnkey[input.grade];
    const core = Math.max(p.livingArea * rate, minimum);
    add("turnkey-core", `${label} turnkey furnishing budget`, core);
    add("turnkey-guests", "Extra-guest addition", Math.max(p.guestCapacity - 8, 0) * extraGuest);
    add("turnkey-specialty", "Specialty-space addition", (s.specialtySpaces ?? 0) * specialty);
    add("turnkey-outdoor", "Outdoor furnishing addition", (s.outdoorFurnishingZones ?? 0) * outdoor);
    add("turnkey-appliances", `${capitalize(s.appliancePackage ?? "none")} appliance package`, appliances[s.appliancePackage ?? "none"]);
    if (rush) add("rush", "Rush delivery", Math.max(sum(lines) * .1, 2500));
    const merchandiseCost = core * allocation * .85;
    const loadedLabor = (p.livingArea / 1000 * hoursPerThousand * 1.25) * 65;
    const contributionMargin = (core - merchandiseCost - loadedLabor - core * .1 - core * .05) / core;
    internalPricingReview = { contributionMargin: Math.round(contributionMargin * 10_000) / 10_000, status: contributionMargin >= .15 ? "pass" : "review" };
    if (internalPricingReview.status === "review") reviews.add("TURNKEY_MARGIN_BELOW_TARGET");
    if (input.grade === "utopian") reviews.add("UTOPIAN_TURNKEY");
  }

  if (s.complexity === "custom") reviews.add("CUSTOM_COMPLEXITY");
  if (s.structuralChanges || (s.structuralChangeConcepts ?? 0) > 0) reviews.add("STRUCTURAL_SCOPE");
  if (rush) reviews.add("RUSH_REQUEST");
  if (s.completeMedia === false && input.serviceId !== "turnkey_furnishing") reviews.add("INCOMPLETE_MEDIA");
  const rawTotal = cents(sum(lines));
  if (rawTotal > 150_000) reviews.add("LARGE_QUOTE");
  const total = roundTo(rawTotal, ROUNDING_INCREMENT);
  const expires = new Date(now); expires.setUTCDate(expires.getUTCDate() + 30);
  return {
    id: randomUUID(), quoteNumber: `UD-${now.getUTCFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`, audience: input.audience, serviceId: input.serviceId,
    ruleSetVersion: DESIGN_PRICING_RULE_VERSION, lineItems: lines, rawTotal, subtotal: rawTotal, total,
    assumptions: ["Customer-confirmed dimensions and scope are materially accurate.", "Standard site access and ordinary delivery conditions apply.", "Selections remain subject to availability at designer review."],
    exclusions: ["Sales tax and jurisdiction-specific charges.", "Construction labor, permits, engineering, and contractor fees.", "Travel or extraordinary freight unless shown as a line item."],
    manualReviewReasons: [...reviews], internalPricingReview, completenessScore: Math.min(100, Math.round((input.informationCount / 12) * 100)),
    generatedAt: now.toISOString(), expiresAt: expires.toISOString(), status: "generated", inputSnapshot: input,
  };
}

function addDesignOptions(lines: QuoteLineItem[], designFee: number, scope: QuoteInput["scope"], options: Set<QuoteInput["options"][number]>, threeDRooms: number, walkthrough: string, rush: boolean) {
  const add = (code: string, label: string, amount: number) => { const normalized = cents(amount); if (normalized) lines.push({ code, label, amount: normalized }); };
  add("3d-visualization", `3D visualization${threeDRooms === 1 ? "" : ` × ${threeDRooms}`}`, threeDRooms * 495);
  if (options.has("additional_direction")) add("additional-direction", "Additional design direction", designFee * .2);
  if (options.has("additional_revision")) add("additional-revision", "Additional revision round", Math.max(designFee * .1, 450));
  if (walkthrough === "local") add("walkthrough-local", "Local on-site walkthrough", 450);
  if (walkthrough === "regional") add("walkthrough-regional", "Regional on-site walkthrough", 750);
  if ((scope.merchandiseToProcure ?? 0) > 0) add("procurement", "Procurement management", Math.max((scope.merchandiseToProcure ?? 0) * .18, 1500));
  if (rush) add("rush", "Rush delivery", Math.max(designFee * .25, 750));
}

function capLineItems(lines: QuoteLineItem[], cap: number) { const excess = sum(lines) - cap; if (excess > 0) lines.push({ code: "audit-digital-cap", label: "Digital audit cap adjustment", amount: -cents(excess) }); }
function sum(lines: QuoteLineItem[]) { return lines.reduce((total, line) => total + line.amount, 0); }
function cents(value: number) { return Math.round(value * 100) / 100; }
function roundTo(value: number, increment: number) { return Math.round(value / increment) * increment; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " "); }
function gradeToLevel(grade: DesignGrade) { return grade === "rental" ? "rental_focused" : grade; }
