import { describe, expect, it } from "vitest";
import { fixtureCms } from "@/lib/cms/fixtures";

describe("fixture CMS", () => {
  it("returns all three active launch properties", async () => expect((await fixtureCms.getProperties()).map((p) => p.slug)).toEqual(["buttercup-beauty", "central-ave-socialization", "the-shamrock"]));
  it("returns null for a missing slug", async () => expect(await fixtureCms.getPropertyBySlug("missing")).toBeNull());
});
