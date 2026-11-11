// Our own stay search and direct booking (Ray, 2026-11-11).
//
// Lodgify's search bar sent guests to Utopia's Lodgify website, whose search lists no houses (that
// site was never set up), so every search said "no results". Lodgify's book-now box couldn't start
// from searched dates, and next to our own "Book these dates" it made two book buttons. So the
// whole flow is ours: /stays?arrival=&departure=&guests= lists the houses with a price for those
// dates, and the house page's booking card shows the price and one Book now button that opens
// Lodgify's checkout with the dates and guests filled in. Prices and availability come from
// Lodgify's price quote (the one its book-now box uses), read in the guest's browser. Plain GET
// links throughout, so people (and Lyra) can share or open a search directly.

export const MAX_NIGHTS = 60;
/** Check-out defaults to a week after check-in (Ray, 2026-11-11: rather longer than shorter; guests shorten it). */
export const DEFAULT_NIGHTS = 7;

export interface StaySearch {
  arrival: string;
  departure: string;
  guests: number;
  nights: number;
}

export type StaySearchResult = { search: StaySearch } | { error: string; partial: Partial<StaySearch> } | null;

export interface StayQuote {
  nights: number;
  nightly: number;
  /** Nights before discounts. */
  rentalTotal: number;
  /** Lodgify promotions such as "Last Minute Discount", as negative amounts. */
  discounts: { name: string; value: number }[];
  fees: { name: string; value: number }[];
  taxes: number;
  total: number;
}

export type QuoteResult = { ok: true; quote: StayQuote } | { ok: false; reason: string };

type Param = string | string[] | undefined;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const DAY_MS = 86_400_000;
const LODGIFY_API = "https://checkout.lodgify.com/api/v2/websites";

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

export function addDays(iso: string, days: number): string | null {
  const day = dayNumber(iso);
  return day === null ? null : isoFromDay(day + days);
}

/** Today's date at the shore (the houses are in New Jersey), as YYYY-MM-DD. */
export function shoreToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Reads search params. null when no dates were given. */
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

type Stay = Pick<StaySearch, "arrival" | "departure" | "guests">;

export function staySearchQuery(search: Stay): string {
  return new URLSearchParams({ arrival: search.arrival, departure: search.departure, guests: String(search.guests) }).toString();
}

/** Lodgify's checkout for one house with the dates and guests filled in (adults = guest count). */
export function lodgifyCheckoutUrl(accountSlug: string, rentalId: string, search: Stay): string {
  const query = new URLSearchParams({ currency: "USD", arrival: search.arrival, departure: search.departure, adults: String(search.guests) });
  return `https://checkout.lodgify.com/en/${encodeURIComponent(accountSlug)}/${encodeURIComponent(rentalId)}/reservation?${query.toString()}`;
}

export function lodgifyPriceUrl(accountSlug: string, rentalId: string, search: Stay): string {
  const query = new URLSearchParams({ arrival: search.arrival, departure: search.departure, currency: "USD", adults: String(search.guests), language: "en" });
  return `${LODGIFY_API}/${encodeURIComponent(accountSlug)}/rentals/${encodeURIComponent(rentalId)}/price?${query.toString()}`;
}

function num(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Lodgify's price quote. 200 = the house takes the stay, with its price. 400 = it can't, and
 * `title` says why in plain words ("The house is already booked on these dates", "The minimum
 * stay for this rental is 2 days", "The maximum number of guests allowed is 22.").
 */
export function readQuote(status: number, body: unknown): QuoteResult {
  const data = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const totalPrice = data.totalPrice as Record<string, unknown> | undefined;
  if (status === 200 && totalPrice && typeof totalPrice.total === "number" && totalPrice.total > 0) {
    const rental = (data.rentalPrice ?? {}) as Record<string, unknown>;
    const fees = ((data.fees as { details?: unknown } | undefined)?.details ?? []) as { name?: unknown; value?: unknown }[];
    const promotions = (rental.promotions ?? []) as { name?: unknown; value?: unknown }[];
    return {
      ok: true,
      quote: {
        nights: num(rental.nights),
        nightly: num(rental.nightlyPrice),
        rentalTotal: num(rental.total),
        discounts: Array.isArray(promotions) ? promotions.filter((promo) => typeof promo.name === "string" && num(promo.value) !== 0).map((promo) => ({ name: promo.name as string, value: -Math.abs(num(promo.value)) })) : [],
        fees: Array.isArray(fees) ? fees.filter((fee) => typeof fee.name === "string" && num(fee.value) > 0).map((fee) => ({ name: fee.name as string, value: num(fee.value) })) : [],
        taxes: num((data.localTaxes as { total?: unknown } | undefined)?.total),
        total: totalPrice.total,
      },
    };
  }
  const title = typeof data.title === "string" ? data.title.trim().replace(/\.$/u, "") : "";
  return { ok: false, reason: title || "Not available for those dates" };
}

export async function fetchQuote(accountSlug: string, rentalId: string, search: Stay, signal?: AbortSignal): Promise<QuoteResult> {
  const response = await fetch(lodgifyPriceUrl(accountSlug, rentalId, search), { signal });
  const body: unknown = await response.json().catch(() => null);
  if (response.status >= 500) throw new Error(`Lodgify price ${response.status}`);
  return readQuote(response.status, body);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount);
}

export function formatStayDates(search: Pick<StaySearch, "arrival" | "departure">): string {
  const format = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric", timeZone: "UTC" });
  const a = new Date(`${search.arrival}T00:00:00Z`);
  const d = new Date(`${search.departure}T00:00:00Z`);
  return `${format.format(a)} – ${format.format(d)}, ${year.format(d)}`;
}
