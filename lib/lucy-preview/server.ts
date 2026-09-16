import { randomUUID } from "node:crypto";
import { previewGuestAnswerResponseSchema } from "@/lib/lucy-preview/contracts";
import { PreviewGuestAnswerJwtUnavailable, signPreviewGuestAnswerJwt } from "@/lib/lucy-preview/jwt";
import {
  PreviewMarkerMissing,
  PreviewResponseTooLarge,
  PreviewSetCookiePresent,
  readBoundedResponseBody,
  validateResponseHeaders,
} from "@/lib/lucy-preview/response-validation";

const DEFAULT_TIMEOUT_MS = 15_000; // RC2's consumer total-interaction deadline is 22s; leave margin.

export class PreviewGuestAnswerUnavailable extends Error {
  constructor() {
    super("Preview guest.answer provider is unavailable");
  }
}

type PreviewGuestAnswerEnvironment = {
  PREVIEW_GUEST_ANSWER_ENABLED?: string;
  PREVIEW_GUEST_ANSWER_PROVIDER_URL?: string;
  PREVIEW_GUEST_ANSWER_JWT_PRIVATE_KEY_PEM?: string;
  PREVIEW_GUEST_ANSWER_JWT_KID?: string;
};

export function isPreviewGuestAnswerEnabled(
  env: PreviewGuestAnswerEnvironment = process.env as PreviewGuestAnswerEnvironment,
) {
  return env.PREVIEW_GUEST_ANSWER_ENABLED === "true";
}

function resolveProviderUrl(env: PreviewGuestAnswerEnvironment): URL {
  const raw = env.PREVIEW_GUEST_ANSWER_PROVIDER_URL?.trim();
  if (!raw) throw new PreviewGuestAnswerUnavailable();
  try {
    return new URL(raw);
  } catch {
    throw new PreviewGuestAnswerUnavailable();
  }
}

/**
 * Calls the new guest.answer@1.0 Homes Prime provider — NOT the legacy /api/lucy upstream. This
 * is the isolated preview path: no live guest traffic is wired to it (see app/api/lucy-preview/
 * route.ts, which is not linked from any guest-facing widget).
 */
export async function askPreviewGuestAnswer(
  question: string,
  sessionId: string,
  options: {
    env?: PreviewGuestAnswerEnvironment;
    fetcher?: typeof fetch;
    timeoutMs?: number;
  } = {},
): Promise<{ answer: string }> {
  const env = options.env ?? (process.env as PreviewGuestAnswerEnvironment);
  if (!isPreviewGuestAnswerEnabled(env)) throw new PreviewGuestAnswerUnavailable();

  const providerUrl = resolveProviderUrl(env);

  let token: string;
  try {
    token = await signPreviewGuestAnswerJwt(env);
  } catch (err) {
    if (err instanceof PreviewGuestAnswerJwtUnavailable) throw new PreviewGuestAnswerUnavailable();
    throw err;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const requestBody = {
    contract_version: "1.0",
    session_id: sessionId,
    message: { turn_id: randomUUID(), content: question },
    locale: "en-US",
  };
  const requestId = randomUUID();

  try {
    const response = await (options.fetcher ?? fetch)(providerUrl, {
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

    // Read and validate the RC2-required/diagnostic header allowlist server-side, so Stage 1 can
    // accurately claim protocol-preview coverage — see response-validation.ts for exactly which
    // checks are hard failures (Set-Cookie, the preview marker) versus logged-only diagnostics.
    // This is the ONLY thing that touches response.headers; the object below is content-free
    // (booleans/short strings) and is logged server-side ONLY — never returned from this
    // function, never included in the route's {ok, answer} response, never sent to analytics.
    const diagnostics = validateResponseHeaders(response, requestId);
    if (!diagnostics.requestIdEchoOk || !diagnostics.contentTypeOk || !diagnostics.cacheControlOk) {
      console.warn("[lucy-preview] response header diagnostic mismatch", diagnostics);
    }

    // Bounded raw-byte read BEFORE any JSON parsing (RC2 Section 6's 64 KiB response cap) —
    // never parse first and check size after.
    const rawBody = await readBoundedResponseBody(response);

    // Never forward provider error detail (code/message/correlation_id) to the caller — matches
    // the existing /api/lucy route's own no-leak convention for the legacy upstream.
    if (!response.ok) throw new PreviewGuestAnswerUnavailable();

    const payload = ((): unknown => {
      try {
        return JSON.parse(rawBody);
      } catch {
        return null;
      }
    })();
    const result = previewGuestAnswerResponseSchema.safeParse(payload);
    if (!result.success || result.data.outcome !== "answered") {
      throw new PreviewGuestAnswerUnavailable();
    }
    return { answer: result.data.answer };
  } catch (err) {
    if (
      err instanceof PreviewMarkerMissing ||
      err instanceof PreviewSetCookiePresent ||
      err instanceof PreviewResponseTooLarge
    ) {
      console.warn("[lucy-preview] response failed a hard validation check", err.message);
    }
    if (err instanceof PreviewGuestAnswerUnavailable) throw err;
    throw new PreviewGuestAnswerUnavailable();
  } finally {
    clearTimeout(timeout);
  }
}
