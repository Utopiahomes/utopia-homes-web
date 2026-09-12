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
    ).resolves.toEqual({
      outcome: "answered",
      answer: "Utopia creates distinctive stays for groups.",
      sources: [],
      links: [],
    });

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

  it("forwards only bounded page and temporary conversation context", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        contract: "lucy.public-answer.v2",
        outcome: "partial",
        answer: "Buttercup has approved parking information, but no seasonal pool schedule.",
        clarification: "Contact Utopia for the November pool schedule.",
        sources: [
          {
            id: "buttercup-parking",
            label: "Buttercup Beauty",
            href: "https://www.utopiahomes.com/stays/buttercup-beauty",
          },
        ],
        links: [{ id: "contact", label: "Contact Utopia", href: "/contact" }],
        version: 2,
        snapshot_digest: "a".repeat(64),
      }),
    );

    await expect(
      askPublicLucy("How many cars fit?", "1db886ff-7d89-4aa7-b9a1-083a98b80702", {
        env: enabledEnvironment,
        fetcher,
        pageContext: { route: "property", property_slug: "buttercup-beauty" },
        history: [
          { role: "visitor", content: "Tell me about Buttercup." },
          { role: "lucy", content: "Buttercup is in Wildwood Crest." },
        ],
      }),
    ).resolves.toMatchObject({ outcome: "partial", clarification: expect.any(String) });

    const [requestedUrl, requestedOptions] = fetcher.mock.calls[0];
    expect(String(requestedUrl)).toBe(enabledEnvironment.LUCY_PUBLIC_API_URL);
    expect(requestedOptions?.body).toBe(
      JSON.stringify({
        question: "How many cars fit?",
        page_context: { route: "property", property_slug: "buttercup-beauty" },
        history: [
          { role: "visitor", content: "Tell me about Buttercup." },
          { role: "lucy", content: "Buttercup is in Wildwood Crest." },
        ],
      }),
    );
  });

  it("maps a knowledge miss to an honest fallback instead of an outage", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ detail: "Public answer is unavailable" }, { status: 404 }),
    );
    await expect(
      askPublicLucy("Is the pool open in November?", "1db886ff-7d89-4aa7-b9a1-083a98b80702", {
        env: enabledEnvironment,
        fetcher,
      }),
    ).resolves.toMatchObject({ outcome: "fallback", links: [{ href: "/contact" }] });
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

  it("rejects same-host references with credentials or an unapproved port", async () => {
    for (const href of [
      "https://visitor:secret@www.utopiahomes.com/contact",
      "https://www.utopiahomes.com:8443/contact",
    ]) {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json({
          contract: "lucy.public-answer.v2",
          outcome: "answered",
          answer: "Unsafe link",
          sources: [{ id: "unsafe", label: "Unsafe", href }],
          links: [],
          version: 2,
          snapshot_digest: "a".repeat(64),
        }),
      );
      await expect(
        askPublicLucy("Question", "1db886ff-7d89-4aa7-b9a1-083a98b80702", {
          env: enabledEnvironment,
          fetcher,
        }),
      ).rejects.toThrow(PublicLucyUnavailable);
    }
  });
});
