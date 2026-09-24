import { randomUUID } from "node:crypto";
import type {
  PublicLucyHistoryTurn,
  PublicLucyPageContext,
  PublicLucyReference,
} from "@/lib/lucy/contracts";
import { previewGuestAnswerResponseSchema } from "@/lib/lucy-preview/contracts";
import { PreviewGuestAnswerJwtUnavailable, signPreviewGuestAnswerJwt } from "@/lib/lucy-preview/jwt";
import {
  readBoundedResponseBody,
  validatePreBodyHeaders,
  validateRetryableErrorHeaders,
  validateSuccessReleaseHeaders,
} from "@/lib/lucy-preview/response-validation";

/**
 * The /api/lucy backend for Utopia Homes Prime: Business Contract guest.answer@1.0 (RC2).
 *
 * Selected by the operator with LUCY_ANSWER_BACKEND=homes-prime. The default stays the legacy Public
 * Lucy upstream, and switching back is the rollback: an operator decision, never an automatic
 * per-request fallback. The browser keeps the conversation (bounded, in memory). This adapter sends
 * that bounded history with each question, and Homes Prime keeps nothing.
 */

const DEFAULT_TIMEOUT_MS = 15_000; // RC2 caps an attempt at 15 s; the interaction limit is 22 s.
const HISTORY_MAX_ENTRIES = 12;
const HISTORY_MAX_CHARACTERS = 10_000;
/**
 * The out-of-band marker Homes Prime sends while its own engine is a preview candidate. It is
 * checked here, never forwarded to the browser.
 */
const HOMES_PRIME_MARKER = "homes-prime-candidate";

export class HomesPrimeUnavailable extends Error {
  constructor() {
    super("Homes Prime is unavailable");
  }
}

type HomesPrimeEnvironment = {
  LUCY_ANSWER_BACKEND?: string;
  HOMES_PRIME_GUEST_ANSWER_URL?: string;
  HOMES_PRIME_GUEST_ANSWER_JWT_PRIVATE_KEY_PEM?: string;
  HOMES_PRIME_GUEST_ANSWER_JWT_KID?: string;
  LUCY_PUBLIC_SITE_HOSTNAME?: string;
};

export type HomesPrimeResult = {
  outcome: "answered" | "partial" | "fallback";
  answer: string;
  sources: PublicLucyReference[];
  links: PublicLucyReference[];
};

export function isHomesPrimeBackend(env: HomesPrimeEnvironment = process.env as HomesPrimeEnvironment) {
  return env.LUCY_ANSWER_BACKEND === "homes-prime";
}

const ROUTE_PATHS: Record<PublicLucyPageContext["route"], string> = {
  home: "/",
  stays: "/stays",
  property: "/stays",
  destinations: "/destinations",
  destination: "/destinations",
  owners: "/owners",
  design: "/design",
  membership: "/membership",
  about: "/about",
  contact: "/contact",
  other_public: "/",
};

/** The widget's page context in RC2's shape: only a property page names a subject. */
export function toGuestAnswerPageContext(context: PublicLucyPageContext) {
  if (context.route === "property" && context.property_slug) {
    return {
      path: `/stays/${context.property_slug}`,
      subject_type: "property",
      subject_id: context.property_slug,
    };
  }
  return { path: ROUTE_PATHS[context.route], subject_type: "none", subject_id: null };
}

/**
 * The widget's recent turns in RC2's shape (§9.1): user and assistant roles, strictly alternating,
 * starting with user and ending with assistant, at most 12 entries and 10,000 characters, each with
 * its own turn ID. The most recent turns win.
 */
export function toGuestAnswerHistory(history: PublicLucyHistoryTurn[]) {
  const turns = history.map((turn) => ({
    role: turn.role === "visitor" ? ("user" as const) : ("assistant" as const),
    content: turn.content,
  }));
  const kept: typeof turns = [];
  // Walk backwards so the most recent alternating run survives.
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const turn = turns[index];
    const expected = kept.length === 0 ? "assistant" : kept[0].role === "user" ? "assistant" : "user";
    if (turn.role !== expected) {
      if (kept.length === 0) continue; // skip trailing user turns until an assistant turn
      break;
    }
    kept.unshift(turn);
  }
  while (kept.length > 0 && kept[0].role !== "user") kept.shift();
  while (
    kept.length > HISTORY_MAX_ENTRIES ||
    kept.reduce((total, turn) => total + turn.content.length, 0) > HISTORY_MAX_CHARACTERS
  ) {
    kept.splice(0, 2); // drop the oldest user/assistant pair
  }
  return kept.map((turn) => ({ turn_id: randomUUID(), ...turn }));
}

function approvedReference(reference: PublicLucyReference, siteHostname: string) {
  try {
    const url = new URL(reference.href, `https://${siteHostname}`);
    return (
      url.protocol === "https:" &&
      url.hostname === siteHostname &&
      (url.port === "" || url.port === "443") &&
      url.username === "" &&
      url.password === ""
    );
  } catch {
    return false;
  }
}

const OUTCOMES: Record<string, HomesPrimeResult["outcome"]> = {
  answered: "answered",
  partial: "partial",
  clarification_needed: "partial",
  out_of_scope: "fallback",
  refused: "fallback",
};

export async function askHomesPrime(
  question: string,
  sessionId: string,
  options: {
    env?: HomesPrimeEnvironment;
    fetcher?: typeof fetch;
    timeoutMs?: number;
    pageContext?: PublicLucyPageContext;
    history?: PublicLucyHistoryTurn[];
  } = {},
): Promise<HomesPrimeResult> {
  const env = options.env ?? (process.env as HomesPrimeEnvironment);
  const siteHostname = env.LUCY_PUBLIC_SITE_HOSTNAME?.trim().toLowerCase();
  let providerUrl: URL;
  let token: string;
  try {
    providerUrl = new URL(env.HOMES_PRIME_GUEST_ANSWER_URL?.trim() ?? "");
    if (providerUrl.protocol !== "https:" && process.env.NODE_ENV === "production") {
      throw new HomesPrimeUnavailable();
    }
    token = await signPreviewGuestAnswerJwt({
      PREVIEW_GUEST_ANSWER_JWT_PRIVATE_KEY_PEM: env.HOMES_PRIME_GUEST_ANSWER_JWT_PRIVATE_KEY_PEM,
      PREVIEW_GUEST_ANSWER_JWT_KID: env.HOMES_PRIME_GUEST_ANSWER_JWT_KID,
    });
  } catch (err) {
    if (err instanceof PreviewGuestAnswerJwtUnavailable || err instanceof TypeError) {
      throw new HomesPrimeUnavailable();
    }
    throw err instanceof HomesPrimeUnavailable ? err : new HomesPrimeUnavailable();
  }
  if (!siteHostname) throw new HomesPrimeUnavailable();

  const history = toGuestAnswerHistory(options.history ?? []);
  const requestBody = {
    contract_version: "1.0",
    session_id: sessionId,
    message: { turn_id: randomUUID(), content: question },
    locale: "en-US",
    ...(history.length ? { history } : {}),
    ...(options.pageContext ? { page_context: toGuestAnswerPageContext(options.pageContext) } : {}),
  };
  const requestId = randomUUID();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let response: Response | undefined;

  try {
    response = await (options.fetcher ?? fetch)(providerUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Request-ID": requestId,
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    validatePreBodyHeaders(response, requestId, HOMES_PRIME_MARKER);
    const rawBody = await readBoundedResponseBody(response);
    const payload = ((): unknown => {
      try {
        return JSON.parse(rawBody);
      } catch {
        return null;
      }
    })();
    if (!response.ok) {
      // Validated for conformance only; provider error detail never reaches the browser.
      validateRetryableErrorHeaders(response, payload);
      throw new HomesPrimeUnavailable();
    }
    validateSuccessReleaseHeaders(response);
    const result = previewGuestAnswerResponseSchema.safeParse(payload);
    if (!result.success) throw new HomesPrimeUnavailable();
    const sources = result.data.sources.map((s) => ({ id: s.source_id, label: s.title, href: s.url }));
    const links = result.data.actions.map((a) => ({ id: a.action_id, label: a.label, href: a.url }));
    if (![...sources, ...links].every((reference) => approvedReference(reference, siteHostname))) {
      throw new HomesPrimeUnavailable();
    }
    return { outcome: OUTCOMES[result.data.outcome], answer: result.data.answer, sources, links };
  } catch {
    if (response && !response.bodyUsed) await response.body?.cancel().catch(() => undefined);
    throw new HomesPrimeUnavailable();
  } finally {
    clearTimeout(timeout);
  }
}
