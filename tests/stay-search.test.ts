import { describe, expect, it } from "vitest";
import { addDays, formatUsd, lodgifyCheckoutUrl, lodgifyPriceUrl, parseStaySearch, readQuote, shoreToday, staySearchQuery } from "@/lib/booking/stay-search";

describe("stay search params", () => {
  it("is empty without dates", () => expect(parseStaySearch({}, "2026-11-11")).toBeNull());
  it("reads a valid search", () => expect(parseStaySearch({ arrival: "2026-12-11", departure: "2026-12-13", guests: "6" }, "2026-11-11")).toEqual({ search: { arrival: "2026-12-11", departure: "2026-12-13", guests: 6, nights: 2 } }));
  it("rejects check-out before check-in", () => expect(parseStaySearch({ arrival: "2026-12-13", departure: "2026-12-11" }, "2026-11-11")).toMatchObject({ error: expect.stringContaining("after check-in") }));
  it("rejects past check-in", () => expect(parseStaySearch({ arrival: "2026-11-01", departure: "2026-11-03" }, "2026-11-11")).toMatchObject({ error: expect.stringContaining("past") }));
  it("rejects impossible dates", () => expect(parseStaySearch({ arrival: "2026-02-30", departure: "2026-03-02" }, "2026-01-01")).toMatchObject({ error: expect.any(String) }));
  it("uses the shore's date", () => expect(shoreToday(new Date("2026-11-12T03:00:00Z"))).toBe("2026-11-11"));
  it("adds days across months", () => expect(addDays("2026-12-31", 2)).toBe("2027-01-02"));
});

describe("Lodgify links", () => {
  const stay = { arrival: "2026-12-11", departure: "2026-12-13", guests: 4 };
  it("links a search", () => expect(staySearchQuery(stay)).toBe("arrival=2026-12-11&departure=2026-12-13&guests=4"));
  it("builds the checkout link", () => expect(lodgifyCheckoutUrl("raymond-p-deluca", "863593", stay)).toBe("https://checkout.lodgify.com/en/raymond-p-deluca/863593/reservation?currency=USD&arrival=2026-12-11&departure=2026-12-13&adults=4"));
  it("builds the price link", () => expect(lodgifyPriceUrl("raymond-p-deluca", "863593", stay)).toBe("https://checkout.lodgify.com/api/v2/websites/raymond-p-deluca/rentals/863593/price?arrival=2026-12-11&departure=2026-12-13&currency=USD&adults=4&language=en"));
});

describe("reading Lodgify's price quote", () => {
  it("reads a price", () => {
    // Shape of Lodgify's answer for The Shamrock, Dec 11-13 2026, 4 guests.
    const body = { rentalPrice: { totalWithPromotions: 1154, total: 1154, nightlyPrice: 577, nights: 2 }, fees: { total: 350, details: [{ name: "Cleaning fee", value: 350 }] }, localTaxes: { total: 0, details: [] }, totalPrice: { total: 1504 } };
    expect(readQuote(200, body)).toEqual({ ok: true, quote: { nights: 2, nightly: 577, rentalTotal: 1154, discounts: [], fees: [{ name: "Cleaning fee", value: 350 }], taxes: 0, total: 1504 } });
  });
  it("keeps Lodgify's discounts", () => {
    // The Shamrock, Dec 4-6 2026: Lodgify's last-minute discount.
    const body = { rentalPrice: { nightlyPrice: 577, nights: 2, promotions: [{ name: "Last Minute Discount", value: -57.7 }], total: 1154, totalWithPromotions: 1096.3 }, fees: { details: [{ name: "Cleaning fee", value: 350 }] }, totalPrice: { total: 1446.3 } };
    expect(readQuote(200, body)).toMatchObject({ ok: true, quote: { rentalTotal: 1154, discounts: [{ name: "Last Minute Discount", value: -57.7 }], total: 1446.3 } });
  });
  it("passes on why a house can't take the stay", () => expect(readQuote(400, { title: "The maximum number of guests allowed is 22." })).toEqual({ ok: false, reason: "The maximum number of guests allowed is 22" }));
  it("has a fallback reason", () => expect(readQuote(400, null)).toEqual({ ok: false, reason: "Not available for those dates" }));
  it("formats dollars", () => expect([formatUsd(1504), formatUsd(340.5)]).toEqual(["$1,504", "$340.50"]));
});
