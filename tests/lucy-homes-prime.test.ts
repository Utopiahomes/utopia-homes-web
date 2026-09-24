import { generateKeyPairSync, randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/lucy/route";
import { clearRateLimits } from "@/lib/forms/rate-limit";
import {
  HomesPrimeUnavailable,
  askHomesPrime,
  toGuestAnswerHistory,
  toGuestAnswerPageContext,
} from "@/lib/lucy/homes-prime";

const { privateKey } = generateKeyPairSync("ed25519");
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;
const providerUrl = "https://homes-prime.example/business/v1/guest/answer";
const env = {
  LUCY_ANSWER_BACKEND: "homes-prime",
  HOMES_PRIME_GUEST_ANSWER_URL: providerUrl,
  HOMES_PRIME_GUEST_ANSWER_JWT_PRIVATE_KEY_PEM: privateKeyPem,
  HOMES_PRIME_GUEST_ANSWER_JWT_KID: "website-key-1",
  LUCY_PUBLIC_SITE_HOSTNAME: "www.utopiahomes.com",
};

function answer(overrides: Record<string, unknown> = {}) {
  return {
    contract_version: "1.0",
    response_id: randomUUID(),
    session_id: randomUUID(),
    assistant_turn_id: randomUUID(),
    outcome: "answered",
    answer: "The Shamrock welcomes up to 32 guests.",
    sources: [
      {
        source_id: "public-source:shamrock-page",
        title: "The Shamrock",
        url: "https://www.utopiahomes.com/stays/the-shamrock",
      },
    ],
    actions: [
      {
        action_id: "public-link:shamrock-page-link",
        kind: "open_internal_link",
        label: "View The Shamrock",
        url: "https://www.utopiahomes.com/stays/the-shamrock",
      },
    ],
    limitations: [],
    ...overrides,
  };
}

/** A Homes Prime response with the headers RC2 and this adapter require. */
function provider(body: unknown, { status = 200, marker = "homes-prime-candidate" } = {}) {
  return vi.fn<typeof fetch>(async (_url, init) => {
    const requestId = new Headers(init?.headers).get("x-request-id") ?? "";
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "x-request-id": requestId,
        "x-utopia-preview-mode": marker,
        "x-utopia-business-release": "homes-business:release:test.1",
        "x-utopia-knowledge-release": "homes-knowledge:r1",
        ...(status === 503 ? { "retry-after": "2" } : {}),
      },
    });
  });
}

describe("translating the widget's request into guest.answer", () => {
  it("keeps the most recent alternating turns, starting with user and ending with assistant", () => {
    const history = toGuestAnswerHistory([
      { role: "lucy", content: "Welcome!" },
      { role: "visitor", content: "Tell me about Buttercup." },
      { role: "lucy", content: "Buttercup Beauty welcomes up to 22 guests." },
      { role: "visitor", content: "And parking?" },
    ]);
    expect(history.map((turn) => [turn.role, turn.content])).toEqual([
      ["user", "Tell me about Buttercup."],
      ["assistant", "Buttercup Beauty welcomes up to 22 guests."],
    ]);
    expect(new Set(history.map((turn) => turn.turn_id)).size).toBe(2);
  });

  it("drops the oldest pairs to stay inside RC2's bounds", () => {
    const turns = Array.from({ length: 16 }, (_, index) => ({
      role: index % 2 === 0 ? ("visitor" as const) : ("lucy" as const),
      content: `turn ${index}`,
    }));
    const history = toGuestAnswerHistory(turns);
    expect(history).toHaveLength(12);
    expect(history[0]).toMatchObject({ role: "user", content: "turn 4" });
    expect(history.at(-1)).toMatchObject({ role: "assistant", content: "turn 15" });
  });

  it("names a subject only on a property page", () => {
    expect(toGuestAnswerPageContext({ route: "property", property_slug: "the-shamrock" })).toEqual({
      path: "/stays/the-shamrock",
      subject_type: "property",
      subject_id: "the-shamrock",
    });
    expect(toGuestAnswerPageContext({ route: "design" })).toEqual({
      path: "/design",
      subject_type: "none",
      subject_id: null,
    });
  });
});

describe("askHomesPrime", () => {
  it("sends the question with history and page context, and maps the answer for the widget", async () => {
    const fetcher = provider(answer({ outcome: "refused" }));
    const result = await askHomesPrime("Can we bring a dog?", randomUUID(), {
      env,
      fetcher,
      pageContext: { route: "property", property_slug: "the-shamrock" },
      history: [
        { role: "visitor", content: "Tell me about The Shamrock." },
        { role: "lucy", content: "The Shamrock welcomes up to 32 guests." },
      ],
    });
    expect(result).toEqual({
      outcome: "fallback",
      answer: "The Shamrock welcomes up to 32 guests.",
      sources: [
        { id: "public-source:shamrock-page", label: "The Shamrock", href: "https://www.utopiahomes.com/stays/the-shamrock" },
      ],
      links: [
        { id: "public-link:shamrock-page-link", label: "View The Shamrock", href: "https://www.utopiahomes.com/stays/the-shamrock" },
      ],
    });
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toBe(providerUrl);
    const headers = new Headers(init?.headers);
    expect(headers.get("authorization")).toMatch(/^Bearer ey/);
    expect(headers.get("idempotency-key")).toMatch(/^[0-9a-f-]{36}$/);
    const sent = JSON.parse(String(init?.body));
    expect(sent.page_context).toEqual({
      path: "/stays/the-shamrock",
      subject_type: "property",
      subject_id: "the-shamrock",
    });
    expect(sent.history.map((turn: { role: string }) => turn.role)).toEqual(["user", "assistant"]);
    expect(sent.message.content).toBe("Can we bring a dog?");
  });

  it.each([
    ["a link to another host", provider(answer({ actions: [{ action_id: "x", kind: "open_internal_link", label: "Elsewhere", url: "https://elsewhere.example/" }] }))],
    ["the legacy bridge answering instead of Homes' own engine", provider(answer(), { marker: "legacy-bridge" })],
    ["a provider error", provider({ contract_version: "1.0", error: { code: "temporarily_unavailable", message: "x", correlation_id: randomUUID(), retryable: true } }, { status: 503 })],
    ["a malformed body", provider({ unexpected: true })],
  ])("fails closed on %s", async (_label, fetcher) => {
    await expect(askHomesPrime("Hello there", randomUUID(), { env, fetcher })).rejects.toThrow(
      HomesPrimeUnavailable,
    );
  });

  it("is unavailable without its configuration", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      askHomesPrime("Hello there", randomUUID(), { env: { ...env, HOMES_PRIME_GUEST_ANSWER_URL: "" }, fetcher }),
    ).rejects.toThrow(HomesPrimeUnavailable);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("POST /api/lucy with the operator switch", () => {
  function request(body: unknown) {
    return new NextRequest("https://www.utopiahomes.com/api/lucy", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "https://www.utopiahomes.com" },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    clearRateLimits();
    vi.stubEnv("LUCY_PUBLIC_ENABLED", "true");
    vi.stubEnv("LUCY_PUBLIC_SITE_HOSTNAME", "www.utopiahomes.com");
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("asks Homes Prime when the operator selects it, without the legacy configuration", async () => {
    const fetcher = provider(answer());
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request({ question: "How many guests fit at The Shamrock?" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      outcome: "answered",
      answer: "The Shamrock welcomes up to 32 guests.",
    });
    expect(String(fetcher.mock.calls[0][0])).toBe(providerUrl);
  });

  it("returns the usual quiet message when Homes Prime is unavailable, with no fallback", async () => {
    const fetcher = provider({}, { status: 503 });
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request({ question: "How many guests fit at The Shamrock?" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      message: "Lucy is taking a quiet moment. Please try again shortly.",
    });
    expect(fetcher).toHaveBeenCalledTimes(1); // the legacy upstream was not tried
  });

  it("keeps using the legacy upstream when the switch is unset", async () => {
    vi.stubEnv("LUCY_ANSWER_BACKEND", "");
    vi.stubEnv("LUCY_PUBLIC_API_URL", "https://public-lucy.example/v1/public/answer");
    vi.stubEnv("LUCY_PUBLIC_API_TOKEN", "t".repeat(32));
    vi.stubEnv("LUCY_PUBLIC_SNAPSHOT_DIGEST", "b".repeat(64));
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        answer: "Utopia Homes serves the Wildwoods.",
        source: "content://utopia/public/approved-v1",
        version: 1,
        snapshot_digest: "b".repeat(64),
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const response = await POST(request({ question: "Where are you located?" }));
    expect(response.status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toBe("https://public-lucy.example/v1/public/answer");
  });
});
