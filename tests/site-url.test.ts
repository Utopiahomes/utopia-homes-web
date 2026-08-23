import { describe, expect, it } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

describe("getSiteUrl", () => {
  it.each([undefined, "", "   "])("uses localhost for %j", (value) => {
    expect(getSiteUrl(value).href).toBe("http://localhost:3000/");
  });

  it("uses a valid configured URL", () => {
    expect(getSiteUrl("https://preview.example.com").href).toBe("https://preview.example.com/");
  });
});
