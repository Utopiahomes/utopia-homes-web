import type { Property } from "@/types/content";

/**
 * One reading of a home's approved record, shared by the guide pages, the FAQ, and llms.txt.
 *
 * Ray, 2026-11-18: answer engines never surfaced Utopia for questions like "sleeps 22 with a private
 * pool" and had some facts wrong. Reading the answers from the record means a page can't call The
 * Shamrock a pool home, and a capacity change reaches every page at once.
 */
export interface StayFacts {
  name: string;
  slug: string;
  city: string;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  pool: string | null;
  hotTub: string | null;
  fencedYard: string | null;
  parkingCars: number;
  streetParking: boolean;
  dogsWelcome: boolean;
  maxDogs: number;
  noPetFee: boolean;
  noCats: boolean;
}

function required(value: number | undefined, label: string, property: Property): number {
  if (value === undefined || Number.isNaN(value)) throw new Error(`${property.slug} has no approved ${label}`);
  return value;
}

export function stayFacts(property: Property): StayFacts {
  const amenities = property.amenities.flatMap((group) => group.amenities);
  const amenity = (pattern: RegExp) => amenities.find((name) => pattern.test(name)) ?? null;
  return {
    name: property.name,
    slug: property.slug,
    city: property.city,
    guests: required(property.maxGuests, "guest capacity", property),
    bedrooms: required(property.bedrooms, "bedroom count", property),
    beds: required(property.beds, "bed count", property),
    bathrooms: required(property.bathrooms, "bathroom count", property),
    pool: amenity(/\bpool\b/i),
    hotTub: amenity(/\bhot tub\b/i),
    fencedYard: amenity(/\bfenced\b/i),
    parkingCars: required(Number(/parking for (\d+) cars?/i.exec(property.parking)?.[1]), "parking count", property),
    streetParking: /street parking/i.test(property.parking),
    dogsWelcome: /\bdogs?\b[^.]*\bwelcome\b/i.test(property.petPolicy),
    maxDogs: required(Number(/up to (\d+) dogs?/i.exec(property.petPolicy)?.[1]), "dog limit", property),
    noPetFee: /no pet fee/i.test(property.petPolicy),
    noCats: /no cats/i.test(property.petPolicy),
  };
}

export function parkingLabel(facts: StayFacts): string {
  return `${facts.parkingCars} cars${facts.streetParking ? ", plus street parking" : ""}`;
}

export function dogsLabel(facts: StayFacts): string {
  if (!facts.dogsWelcome) return "No dogs";
  return [`Up to ${facts.maxDogs} dogs`, facts.noPetFee ? "no pet fee" : null, facts.noCats ? "no cats" : null].filter(Boolean).join(", ");
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

export function numberWord(value: number): string {
  return NUMBER_WORDS[value] ?? String(value);
}

/** "A, B, and C" */
export function listOf(items: string[]): string {
  if (items.length < 3) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
