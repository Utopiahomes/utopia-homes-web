import type { BookingDestination, PropertyBookingConfiguration } from "@/types/content";

export function resolveBookingDestination(configuration: PropertyBookingConfiguration): BookingDestination {
  if (configuration.mode === "primary" && configuration.primary) return configuration.primary;
  return configuration.fallback;
}
