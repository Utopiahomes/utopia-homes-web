// Our own stay search (Ray, 2026-11-11). Lodgify's search bar sent guests to Utopia's Lodgify
// website, whose search lists no houses at all (that site was never set up), so every search said
// "no results". Instead the search stays on utopiahomes.com: /stays?arrival=&departure=&guests=
// checks each house against its Lodgify calendar, the same calendar the house page's book-now box
// reads. Plain GET links so people (and Lyra) can share or open a search directly.

export const MAX_NIGHTS = 60;

export interface StaySearch {
  arrival: string;
  departure: string;
  guests: number;
  nights: number;
}

export type StaySearchResult = { search: StaySearch } | { error: string; partial: Partial<StaySearch> } | null;

export interface CalendarDay {
  date: string;
  minimalStay: number;
  maximumStay: number;
  isCheckInAvailable: boolean;
  isCheckOutAvailable: boolean;
  isAvailable: boolean;
}

export type StayVerdict = { available: true } | { available: false; reason: string };

type Param = string | string[] | undefined;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const DAY_MS = 86_400_000;

function first(value: Param): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function dayNumber(iso: string): number | null {
  if (!ISO_DATE.test(iso)) return null;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== iso) return null;
  return ms / DAY_MS;
}

export function isoFromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10);
}

/** Today's date at the shore (the houses are in New Jersey), as YYYY-MM-DD. */
export function shoreToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Reads /stays search params. null when no dates were given (plain Stays page). */
export function parseStaySearch(params: { arrival?: Param; departure?: Param; guests?: Param }, today: string): StaySearchResult {
  const arrival = first(params.arrival)?.trim() ?? "";
  const departure = first(params.departure)?.trim() ?? "";
  const guestsRaw = Number.parseInt(first(params.guests) ?? "", 10);
  const guests = Number.isFinite(guestsRaw) ? Math.min(Math.max(guestsRaw, 1), 99) : 1;
  if (!arrival && !departure) return null;
  const partial: Partial<StaySearch> = { arrival, departure, guests };
  const start = dayNumber(arrival);
  const end = dayNumber(departure);
  const todayNumber = dayNumber(today) ?? 0;
  if (start === null || end === null) return { error: "Pick a check-in and a check-out date.", partial };
  if (start < todayNumber) return { error: "Check-in can't be in the past.", partial };
  if (end <= start) return { error: "Check-out needs to be after check-in.", partial };
  const nights = end - start;
  if (nights > MAX_NIGHTS) return { error: `For stays longer than ${MAX_NIGHTS} nights, please contact us.`, partial };
  return { search: { arrival, departure, guests, nights } };
}

/** Whether one house can take this stay, from its Lodgify calendar (starting at or before arrival). */
export function checkStay(calendar: readonly CalendarDay[], search: StaySearch, maxGuests: number | undefined): StayVerdict {
  if (maxGuests && search.guests > maxGuests) return { available: false, reason: `Sleeps up to ${maxGuests}` };
  const byDate = new Map(calendar.map((day) => [day.date, day]));
  const start = dayNumber(search.arrival)!;
  const end = dayNumber(search.departure)!;
  for (let day = start; day < end; day += 1) {
    const entry = byDate.get(isoFromDay(day));
    if (!entry) return { available: false, reason: "Not open for booking yet" };
    if (!entry.isAvailable) return { available: false, reason: "Booked for some of those nights" };
  }
  const arrivalDay = byDate.get(search.arrival)!;
  const departureDay = byDate.get(search.departure);
  if (!arrivalDay.isCheckInAvailable) return { available: false, reason: "Check-in isn't available that day" };
  if (departureDay && !departureDay.isCheckOutAvailable) return { available: false, reason: "Check-out isn't available that day" };
  if (search.nights < arrivalDay.minimalStay) return { available: false, reason: `${arrivalDay.minimalStay}-night minimum for those dates` };
  if (arrivalDay.maximumStay && search.nights > arrivalDay.maximumStay) return { available: false, reason: `Up to ${arrivalDay.maximumStay} nights for those dates` };
  return { available: true };
}

// adults is what Lodgify's book-now box reads from the page link, so its own Book Now keeps the
// guest count too.
export function staySearchQuery(search: Pick<StaySearch, "arrival" | "departure" | "guests">): string {
  return new URLSearchParams({ arrival: search.arrival, departure: search.departure, guests: String(search.guests), adults: String(search.guests) }).toString();
}

/** Lodgify's checkout for one house with the dates and guests filled in (the link its book-now box builds). */
export function lodgifyCheckoutUrl(accountSlug: string, rentalId: string, search: Pick<StaySearch, "arrival" | "departure" | "guests">): string {
  const query = new URLSearchParams({ currency: "USD", arrival: search.arrival, departure: search.departure, adults: String(search.guests) });
  return `https://checkout.lodgify.com/en/${encodeURIComponent(accountSlug)}/${encodeURIComponent(rentalId)}/reservation?${query.toString()}`;
}

export function formatStayDates(search: Pick<StaySearch, "arrival" | "departure">): string {
  const format = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" });
  const a = new Date(`${search.arrival}T00:00:00Z`);
  const d = new Date(`${search.departure}T00:00:00Z`);
  return `${format.format(a)} – ${format.format(d)}, ${year.format(d)}`;
}
