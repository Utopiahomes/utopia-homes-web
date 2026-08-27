import type { QuoteClassification, QuoteInput } from "./types";

export interface QuoteQualification {
  classification: QuoteClassification;
  missingRequirements: string[];
}

export function qualifyDesignQuote(input: QuoteInput): QuoteQualification {
  const missing: string[] = [];
  const hasProperty = Boolean(
    input.property.address?.trim() || input.property.listingUrl?.trim(),
  );
  const scope = input.scope;
  const require = (condition: boolean, message: string) => {
    if (!condition) missing.push(message);
  };
  if (input.serviceId === "rental_readiness_audit") {
    require(hasProperty, "Add the property address or rental-listing URL.");
    require(Boolean(
      input.projectDescription?.trim(),
    ), "Describe at least one concern or objective.");
  } else if (input.serviceId === "turnkey_furnishing") {
    require(input.property.livingArea > 0, "Add the approximate living area.");
    require(input.property.bedrooms > 0, "Add the bedroom count.");
    require(input.property.bathrooms > 0, "Add the bathroom count.");
    require(input.property.guestCapacity >
      0, "Add the intended guest capacity.");
    require(Boolean(
      scope.furnishingStatus && scope.furnishingStatus !== "unknown",
    ), "Choose the current furnishing status.");
  } else if (input.serviceId === "room_design_plan") {
    require(scope.roomCount > 0, "Choose at least one room and quantity.");
    require(scope.affectedArea > 0, "Add the approximate room square footage.");
  } else if (input.serviceId === "whole_home_design_plan") {
    require(input.property.livingArea >
      0, "Add the approximate area to design.");
    require(input.property.propertyType !==
      "Not sure yet", "Choose the property type.");
    require((scope.structureCount ?? 0) > 0, "Add the number of structures.");
  } else if (input.serviceId === "renovation_design_plan") {
    require(scope.affectedArea > 0, "Add the approximate affected area.");
    require(Boolean(scope.renovationSeverity), "Choose the renovation level.");
    require(Boolean(
      scope.kitchenScopeConfirmed,
    ), "Confirm the kitchen scope, including none.");
    require(Boolean(
      scope.bathroomScopeConfirmed,
    ), "Confirm the bathroom scope, including none.");
    if (input.audience === "personal")
      require(Boolean(
        scope.projectStage && scope.projectStage !== "unknown",
      ), "Choose the current project stage.");
  }
  return {
    classification: missing.length
      ? "planning_estimate"
      : "qualified_preliminary_estimate",
    missingRequirements: missing,
  };
}

export function calendarEligibility(
  classification: QuoteClassification,
  acknowledgedAt: string | undefined,
  expiresAt: string,
  now = new Date(),
) {
  if (classification !== "qualified_preliminary_estimate")
    return {
      eligible: false,
      reason: "Complete the missing scope details to qualify the estimate.",
    };
  if (!acknowledgedAt)
    return {
      eligible: false,
      reason:
        "Acknowledge the preliminary estimate to unlock the consultation.",
    };
  if (new Date(expiresAt) <= now)
    return {
      eligible: false,
      reason: "This estimate has expired and must be refreshed.",
    };
  return {
    eligible: true,
    reason: "Qualified estimate acknowledged and current.",
  };
}
