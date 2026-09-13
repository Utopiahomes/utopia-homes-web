import { describe, expect, it } from "vitest";
import { resolvePublicLucyPageContext } from "@/lib/lucy/page-context";

describe("Public Lucy page context", () => {
  it("maps approved properties without carrying query strings", () => {
    expect(
      resolvePublicLucyPageContext("/stays/buttercup-beauty?email=visitor@example.com"),
    ).toEqual({ route: "property", property_slug: "buttercup-beauty" });
  });

  it("reduces unknown and sensitive-looking paths to a public-neutral context", () => {
    expect(resolvePublicLucyPageContext("/api/admin/retention")).toEqual({
      route: "other_public",
    });
    expect(resolvePublicLucyPageContext("/stays/not-approved")).toEqual({
      route: "other_public",
    });
  });

  it("distinguishes service lines without granting a different audience", () => {
    expect(resolvePublicLucyPageContext("/list-your-home")).toEqual({ route: "owners" });
    expect(resolvePublicLucyPageContext("/design/quote")).toEqual({ route: "design" });
  });
});
