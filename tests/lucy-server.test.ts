import { describe, expect, it, vi } from "vitest";
import {
  askPublicLucy,
  PublicLucyUnavailable,
  resolvePublicLucyConfiguration,
} from "@/lib/lucy/server";

const enabledEnvironment = {
  LUCY_PUBLIC_ENABLED: "true",
  LUCY_PUBLIC_API_URL: "https://public-lucy.example/v1/public/answer",
  LUCY_PUBLIC_API_TOKEN: "t".repeat(32),
  LUCY_PUBLIC_SITE_HOSTNAME: "www.utopiahomes.com",
  LUCY_PUBLIC_SNAPSHOT_DIGEST: "a".repeat(64),
};

describe("Public Lucy server adapter", () => {
  it("fails closed while the feature is disabled or incompletely configured", () => {
    expect(() => resolvePublicLucyConfiguration({ LUCY_PUBLIC_ENABLED: "false" })).toThrow(
      PublicLucyUnavailable,
    );
    expect(() =>
      resolvePublicLucyConfiguration({ ...enabledEnvironment, LUCY_PUBLIC_API_TOKEN: "short" }),
    ).toThrow(PublicLucyUnavailable);
  });

  it("sends only the bounded question and opaque session to the exact upstream", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        answer: "Utopia creates distinctive stays for groups.",
        source: "content://utopia/public/approved-v1",
        version: 1,
        snapshot_digest: "a".repeat(64),
      }),
    );

    await expect(
      askPublicLucy("What is Utopia?", "1db886ff-7d89-4aa7-b9a1-083a98b80702", {
        env: enabledEnvironment,
        fetcher,
      }),
    ).resolves.toEqual({ answer: "Utopia creates distinctive stays for groups." });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).toBe(enabledEnvironment.LUCY_PUBLIC_API_URL);
    expect(options?.redirect).toBe("error");
    expect(options?.body).toBe(JSON.stringify({ question: "What is Utopia?" }));
    expect(options?.headers).toMatchObject({
      Authorization: `Bearer ${enabledEnvironment.LUCY_PUBLIC_API_TOKEN}`,
      Origin: "https://www.utopiahomes.com",
      "X-Lucy-Public-Host": "www.utopiahomes.com",
      "X-Lucy-Public-Session": "1db886ff-7d89-4aa7-b9a1-083a98b80702",
    });
  });

  it("rejects malformed upstream data instead of passing it to the browser", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ answer: "Unscoped" }));
    await expect(
      askPublicLucy("Question", "1db886ff-7d89-4aa7-b9a1-083a98b80702", {
        env: enabledEnvironment,
        fetcher,
      }),
    ).rejects.toThrow(PublicLucyUnavailable);
  });

  it("rejects a valid response from an unapproved snapshot", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        answer: "Answer from a different public version",
        source: "content://utopia/public/other",
        version: 2,
        snapshot_digest: "b".repeat(64),
      }),
    );

    await expect(
      askPublicLucy("Question", "1db886ff-7d89-4aa7-b9a1-083a98b80702", {
        env: enabledEnvironment,
        fetcher,
      }),
    ).rejects.toThrow(PublicLucyUnavailable);
  });
});
