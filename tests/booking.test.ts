import { describe, expect, it } from "vitest";
import { resolveBookingDestination } from "@/lib/booking/destination";
import { appendAttribution, getBookingHost } from "@/lib/booking/link";

describe("booking links", () => {
  it("identifies the outbound host", () => expect(getBookingHost("https://example.com/book")).toBe("example.com"));
  it("preserves UTM attribution", () => expect(appendAttribution("https://example.com/book", "?utm_source=test&ignored=x")).toBe("https://example.com/book?utm_source=test"));
  it("uses the configured primary booking destination", () => {
    expect(resolveBookingDestination({ mode: "primary", primary: { provider: "uplisting", url: "https://book.example.com/stays/home" }, fallback: { provider: "airbnb", url: "https://airbnb.example.com/home" } })).toEqual({ provider: "uplisting", url: "https://book.example.com/stays/home" });
  });
  it("uses the rollback destination when fallback mode is active", () => {
    expect(resolveBookingDestination({ mode: "fallback", primary: { provider: "uplisting", url: "https://book.example.com/stays/home" }, fallback: { provider: "airbnb", url: "https://airbnb.example.com/home" } })).toEqual({ provider: "airbnb", url: "https://airbnb.example.com/home" });
  });
});
