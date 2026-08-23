import { describe, expect, it } from "vitest";
import { appendAttribution, getBookingHost } from "@/lib/booking/link";

describe("booking links", () => {
  it("identifies the outbound host", () => expect(getBookingHost("https://example.com/book")).toBe("example.com"));
  it("preserves UTM attribution", () => expect(appendAttribution("https://example.com/book", "?utm_source=test&ignored=x")).toBe("https://example.com/book?utm_source=test"));
});
