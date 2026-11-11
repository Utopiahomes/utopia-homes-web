import { describe, expect, it } from "vitest";
import { checkStay, parseStaySearch, shoreToday, type CalendarDay, type StaySearch } from "@/lib/booking/stay-search";

function calendar(start: string, days: number, overrides: Record<string, Partial<CalendarDay>> = {}): CalendarDay[] {
  const out: CalendarDay[] = [];
  const base = Date.parse(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i += 1) {
    const date = new Date(base + i * 86_400_000).toISOString().slice(0, 10);
    out.push({ date, minimalStay: 2, maximumStay: 365, isCheckInAvailable: true, isCheckOutAvailable: true, isAvailable: true, ...overrides[date] });
  }
  return out;
}

const stay = (arrival: string, departure: string, guests = 4): StaySearch => {
  const result = parseStaySearch({ arrival, departure, guests: String(guests) }, "2026-11-11");
  if (!result || !("search" in result)) throw new Error("bad test stay");
  return result.search;
};

describe("stay search params", () => {
  it("is empty without dates", () => expect(parseStaySearch({}, "2026-11-11")).toBeNull());
  it("reads a valid search", () => expect(parseStaySearch({ arrival: "2026-12-11", departure: "2026-12-13", guests: "6" }, "2026-11-11")).toEqual({ search: { arrival: "2026-12-11", departure: "2026-12-13", guests: 6, nights: 2 } }));
  it("rejects check-out before check-in", () => expect(parseStaySearch({ arrival: "2026-12-13", departure: "2026-12-11" }, "2026-11-11")).toMatchObject({ error: expect.stringContaining("after check-in") }));
  it("rejects past check-in", () => expect(parseStaySearch({ arrival: "2026-11-01", departure: "2026-11-03" }, "2026-11-11")).toMatchObject({ error: expect.stringContaining("past") }));
  it("rejects impossible dates", () => expect(parseStaySearch({ arrival: "2026-02-30", departure: "2026-03-02" }, "2026-01-01")).toMatchObject({ error: expect.any(String) }));
  it("uses the shore's date", () => expect(shoreToday(new Date("2026-11-12T03:00:00Z"))).toBe("2026-11-11"));
});

describe("checking a house's calendar", () => {
  it("is available when every night is open", () => expect(checkStay(calendar("2026-12-11", 90), stay("2026-12-11", "2026-12-13"), 22)).toEqual({ available: true }));
  it("is not when a night is booked", () => expect(checkStay(calendar("2026-12-11", 90, { "2026-12-12": { isAvailable: false } }), stay("2026-12-11", "2026-12-14"), 22)).toMatchObject({ available: false, reason: expect.stringContaining("Booked") }));
  it("lets a stay end on the day the next booking starts", () => expect(checkStay(calendar("2026-12-01", 90, { "2026-12-04": { isAvailable: false } }), stay("2026-12-02", "2026-12-04"), 22)).toEqual({ available: true }));
  it("respects the minimum stay", () => expect(checkStay(calendar("2026-12-11", 90, { "2026-12-11": { minimalStay: 3 } }), stay("2026-12-11", "2026-12-13"), 22)).toMatchObject({ reason: "3-night minimum for those dates" }));
  it("respects closed check-in days", () => expect(checkStay(calendar("2026-12-11", 90, { "2026-12-11": { isCheckInAvailable: false } }), stay("2026-12-11", "2026-12-13"), 22)).toMatchObject({ available: false }));
  it("respects the guest limit", () => expect(checkStay(calendar("2026-12-11", 90), stay("2026-12-11", "2026-12-13", 30), 22)).toMatchObject({ reason: "Sleeps up to 22" }));
  it("says when dates are past the open calendar", () => expect(checkStay(calendar("2026-12-11", 1), stay("2026-12-11", "2026-12-13"), 22)).toMatchObject({ reason: "Not open for booking yet" }));
});
