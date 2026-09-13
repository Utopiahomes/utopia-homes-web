import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/lucy/route";
import { clearRateLimits } from "@/lib/forms/rate-limit";

const endpoint = "https://public-lucy.example/v1/public/answer";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://www.utopiahomes.com/api/lucy", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://www.utopiahomes.com",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/lucy", () => {
  beforeEach(() => {
    clearRateLimits();
    vi.stubEnv("LUCY_PUBLIC_ENABLED", "true");
    vi.stubEnv("LUCY_PUBLIC_API_URL", endpoint);
    vi.stubEnv("LUCY_PUBLIC_API_TOKEN", "t".repeat(32));
    vi.stubEnv("LUCY_PUBLIC_SITE_HOSTNAME", "www.utopiahomes.com");
    vi.stubEnv("LUCY_PUBLIC_SNAPSHOT_DIGEST", "b".repeat(64));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("rejects cross-origin and invalid questions before calling upstream", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const foreign = await POST(request({ question: "Where are you located?" }, { origin: "https://foreign.example" }));
    expect(foreign.status).toBe(403);

    const invalid = await POST(request({ question: "x" }));
    expect(invalid.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a deployment hostname outside the configured Utopia binding", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const previewRequest = new NextRequest("https://preview.example/api/lucy", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://preview.example" },
      body: JSON.stringify({ question: "Where are you located?" }),
    });

    const response = await POST(previewRequest);
    expect(response.status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns only the approved answer and creates an opaque HttpOnly session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          answer: "Utopia Homes serves the Wildwoods and Cape May region.",
          source: "content://utopia/public/approved-v1",
          version: 1,
          snapshot_digest: "b".repeat(64),
        }),
      ),
    );

    const response = await POST(request({ question: "Where are Utopia Homes located?" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      outcome: "answered",
      answer: "Utopia Homes serves the Wildwoods and Cape May region.",
      sources: [],
      links: [],
    });
    expect(response.headers.get("set-cookie")).toMatch(
      /utopia_lucy_session=.*HttpOnly.*SameSite=Strict/i,
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("stays unavailable when the upstream contract is not configured", async () => {
    vi.stubEnv("LUCY_PUBLIC_API_TOKEN", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);

    const response = await POST(request({ question: "What is Utopia Design?" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      message: "Lucy is taking a quiet moment. Please try again shortly.",
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
