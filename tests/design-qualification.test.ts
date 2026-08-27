import { describe, expect, it } from "vitest";
import {
  calendarEligibility,
  qualifyDesignQuote,
} from "@/lib/design/qualification";
import type { QuoteInput } from "@/lib/design/types";

const base: QuoteInput = {
  audience: "rental",
  serviceId: "rental_readiness_audit",
  property: {
    address: "123 Ocean Ave",
    propertyType: "Single-family home",
    livingArea: 1500,
    bedrooms: 3,
    bathrooms: 2,
    guestCapacity: 8,
  },
  scope: {
    roomCount: 1,
    affectedArea: 300,
    kitchenIncluded: false,
    structuralChanges: false,
    outdoorIncluded: false,
    complexity: "standard",
    structureCount: 1,
  },
  grade: "rental",
  options: [],
  informationCount: 10,
  projectDescription: "Improve guest flow",
  retentionNoticeVersion: "2026-08-27.v2",
};

describe("quote qualification", () => {
  it.each([
    ["rental_readiness_audit", {}],
    ["turnkey_furnishing", { furnishingStatus: "empty" }],
    ["room_design_plan", {}],
    ["whole_home_design_plan", { structureCount: 1 }],
    [
      "renovation_design_plan",
      {
        renovationSeverity: "moderate",
        kitchenScopeConfirmed: true,
        bathroomScopeConfirmed: true,
      },
    ],
  ] as const)("qualifies complete %s inputs", (serviceId, scope) => {
    expect(
      qualifyDesignQuote({
        ...base,
        serviceId,
        scope: { ...base.scope, ...scope },
      }).classification,
    ).toBe("qualified_preliminary_estimate");
  });

  it("requires the personal renovation project stage", () => {
    const result = qualifyDesignQuote({
      ...base,
      audience: "personal",
      serviceId: "renovation_design_plan",
      scope: {
        ...base.scope,
        renovationSeverity: "moderate",
        kitchenScopeConfirmed: true,
        bathroomScopeConfirmed: true,
        projectStage: "unknown",
      },
    });
    expect(result.classification).toBe("planning_estimate");
    expect(result.missingRequirements).toContain(
      "Choose the current project stage.",
    );
  });

  it("never unlocks an incomplete, unacknowledged, or expired quote", () => {
    expect(
      calendarEligibility(
        "planning_estimate",
        "2026-01-01T00:00:00Z",
        "2027-01-01T00:00:00Z",
      ).eligible,
    ).toBe(false);
    expect(
      calendarEligibility(
        "qualified_preliminary_estimate",
        undefined,
        "2027-01-01T00:00:00Z",
      ).eligible,
    ).toBe(false);
    expect(
      calendarEligibility(
        "qualified_preliminary_estimate",
        "2026-01-01T00:00:00Z",
        "2026-02-01T00:00:00Z",
        new Date("2026-03-01T00:00:00Z"),
      ).eligible,
    ).toBe(false);
  });
});
