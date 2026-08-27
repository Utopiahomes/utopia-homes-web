import { describe, expect, it } from "vitest";
import {
  DESIGN_PRICING_RULE_VERSION,
  priceDesignProject,
} from "@/lib/design/pricing";
import type { QuoteInput } from "@/lib/design/types";

const base: QuoteInput = {
  audience: "rental",
  serviceId: "rental_readiness_audit",
  property: {
    propertyType: "House",
    livingArea: 2_200,
    bedrooms: 5,
    bathrooms: 3,
    guestCapacity: 14,
  },
  scope: {
    roomCount: 1,
    affectedArea: 1_000,
    kitchenIncluded: false,
    structuralChanges: false,
    outdoorIncluded: false,
    complexity: "standard",
    specialtySpaces: 2,
    completeMedia: true,
  },
  grade: "rental",
  options: [],
  informationCount: 12,
  retentionNoticeVersion: "2026-08-27.v2",
};

describe("Utopia Design pricing model UD-2026.2", () => {
  it("matches the workbook audit example without obscuring line-item totals", () => {
    const quote = priceDesignProject(base, new Date("2026-08-27T12:00:00Z"));
    expect(quote.rawTotal).toBe(1370);
    expect(quote.total).toBe(1370);
    expect(quote.ruleSetVersion).toBe(DESIGN_PRICING_RULE_VERSION);
    expect(quote.expiresAt).toBe("2026-09-26T12:00:00.000Z");
  });

  it("matches the workbook room-plan example", () => {
    const quote = priceDesignProject({
      ...base,
      serviceId: "room_design_plan",
      scope: {
        ...base.scope,
        roomQuantities: { bedroom: 1 },
        complexity: "elevated",
        threeDRooms: 1,
      },
    });
    expect(quote.rawTotal).toBe(1639.25);
    expect(quote.total).toBe(1639.25);
  });

  it("matches the workbook whole-home example", () => {
    const quote = priceDesignProject({
      ...base,
      serviceId: "whole_home_design_plan",
      property: { ...base.property, livingArea: 2000 },
      scope: {
        ...base.scope,
        designLevel: "rental_focused",
        structureCount: 1,
        threeDRooms: 1,
      },
    });
    expect(quote.rawTotal).toBe(8495);
    expect(quote.total).toBe(8495);
  });

  it("matches the workbook renovation example", () => {
    const quote = priceDesignProject({
      ...base,
      serviceId: "renovation_design_plan",
      scope: {
        ...base.scope,
        affectedArea: 1000,
        declaredConstructionBudget: 150000,
        renovationSeverity: "moderate",
        kitchens: 1,
        fullBathrooms: 2,
        structuralChanges: true,
        structuralChangeConcepts: 1,
        complexity: "elevated",
        specialtySpaces: 0,
      },
    });
    expect(quote.rawTotal).toBe(21850);
    expect(quote.total).toBe(21850);
    expect(quote.manualReviewReasons).toContain("STRUCTURAL_SCOPE");
  });

  it("applies the approved 35/45/55 turnkey override and retains the internal margin guardrail", () => {
    const quote = priceDesignProject({
      ...base,
      serviceId: "turnkey_furnishing",
      property: { ...base.property, livingArea: 1000, guestCapacity: 8 },
      scope: {
        ...base.scope,
        specialtySpaces: 0,
        outdoorFurnishingZones: 0,
        appliancePackage: "none",
      },
    });
    expect(quote.rawTotal).toBe(35000);
    expect(quote.total).toBe(35000);
    expect(quote.internalPricingReview).toEqual({
      contributionMargin: 0.22,
      status: "pass",
    });
  });

  it("keeps the Utopian 1,000 sq. ft. example under manual margin review", () => {
    const quote = priceDesignProject({
      ...base,
      serviceId: "turnkey_furnishing",
      grade: "utopian",
      property: { ...base.property, livingArea: 1000, guestCapacity: 8 },
      scope: {
        ...base.scope,
        specialtySpaces: 0,
        outdoorFurnishingZones: 0,
        appliancePackage: "none",
      },
    });
    expect(quote.total).toBe(55000);
    expect(quote.internalPricingReview).toEqual({
      contributionMargin: 0.148,
      status: "review",
    });
    expect(quote.manualReviewReasons).toContain("TURNKEY_MARGIN_BELOW_TARGET");
  });

  it("applies the $1,495 digital-audit cap", () => {
    const quote = priceDesignProject({
      ...base,
      property: {
        ...base.property,
        livingArea: 9000,
        bedrooms: 20,
        bathrooms: 15,
        guestCapacity: 50,
      },
      scope: { ...base.scope, specialtySpaces: 10 },
    });
    expect(quote.rawTotal).toBe(1495);
    expect(quote.total).toBe(1495);
  });

  it("always reconciles the displayed total to the displayed line items", () => {
    for (const serviceId of [
      "rental_readiness_audit",
      "room_design_plan",
      "whole_home_design_plan",
      "renovation_design_plan",
      "turnkey_furnishing",
    ] as const) {
      const quote = priceDesignProject({
        ...base,
        serviceId,
        scope: {
          ...base.scope,
          furnishingStatus: "empty",
          kitchenScopeConfirmed: true,
          bathroomScopeConfirmed: true,
          renovationSeverity: "moderate",
          designLevel: "elegant",
          structureCount: 1,
        },
      });
      expect(quote.total).toBe(
        quote.lineItems.reduce((sum, item) => sum + item.amount, 0),
      );
    }
  });
});
