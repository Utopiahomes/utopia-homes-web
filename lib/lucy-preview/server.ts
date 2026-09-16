import { randomUUID } from "node:crypto";
import { previewGuestAnswerResponseSchema } from "@/lib/lucy-preview/contracts";
import { PreviewGuestAnswerJwtUnavailable, signPreviewGuestAnswerJwt } from "@/lib/lucy-preview/jwt";
import {
  PreviewResponseHeaderViolation,
  PreviewResponseInvalidEncoding,
  PreviewResponseTooLarge,
  readBoundedResponseBody,
  validatePreBodyHeaders,
  validateRetryableErrorHeaders,
  validateSuccessReleaseHeaders,
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

  // Hoisted so the catch block can cancel an unread body — see below. Only assigned once the
  // fetch itself succeeds; a fetch-level failure has no body to worry about.
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

    // Phase 1: header checks available before the body is read. Fails closed (throws) on ANY
    // violation — wrong Content-Type, missing no-store, an unexpected Set-Cookie, a request-ID
    // echo mismatch, or a wrong/missing preview marker. This is the ONLY thing that touches
    // response.headers before the body is read; nothing here is ever forwarded to the browser.
    const preBodyDiagnostics = validatePreBodyHeaders(response, requestId);

    // Phase 2: bounded, STREAMING raw-byte read (cancels the instant 64 KiB is exceeded, rather
    // than buffering the whole body via response.arrayBuffer() and checking size after the fact)
    // with a FATAL UTF-8 decode (RC2 requires valid UTF-8 JSON; a lossy decode would silently
    // substitute replacement characters instead of rejecting malformed bytes).
    const rawBody = await readBoundedResponseBody(response);
    const payload = ((): unknown => {
      try {
        return JSON.parse(rawBody);
      } catch {
        return null;
      }
    })();

    // Phase 3: outcome-specific fail-closed checks, using the parsed body only to extract a
    // single boolean (never forwarded) for the error path.
    if (response.ok) {
      const releaseDiagnostics = validateSuccessReleaseHeaders(response);
      const result = previewGuestAnswerResponseSchema.safeParse(payload);
      if (!result.success || result.data.outcome !== "answered") {
        throw new PreviewGuestAnswerUnavailable();
      }
      // Evidence, per the header-validation boundary: a content-free record that every check ran
      // and passed, logged server-side only. Deliberately omits previewModeValue (a raw,
      // provider-controlled header value) even though it's already been validated equal to the
      // one expected constant — every other field is a plain boolean.
      console.info("[lucy-preview] response passed all wire validation checks", {
        contentTypeOk: preBodyDiagnostics.contentTypeOk,
        cacheControlOk: preBodyDiagnostics.cacheControlOk,
        setCookieAbsent: preBodyDiagnostics.setCookieAbsent,
        requestIdEchoOk: preBodyDiagnostics.requestIdEchoOk,
        previewModeOk: preBodyDiagnostics.previewModeOk,
        businessReleasePresent: releaseDiagnostics.businessReleasePresent,
        knowledgeReleasePresent: releaseDiagnostics.knowledgeReleasePresent,
      });
      return { answer: result.data.answer };
    }

    // Never forward provider error detail (code/message/correlation_id) to the caller — matches
    // the existing /api/lucy route's own no-leak convention for the legacy upstream. Error detail
    // is read here only to validate Retry-After, never returned.
    const retryDiagnostics = validateRetryableErrorHeaders(response, payload);
    console.info("[lucy-preview] error response passed wire validation checks", {
      contentTypeOk: preBodyDiagnostics.contentTypeOk,
      cacheControlOk: preBodyDiagnostics.cacheControlOk,
      setCookieAbsent: preBodyDiagnostics.setCookieAbsent,
      requestIdEchoOk: preBodyDiagnostics.requestIdEchoOk,
      previewModeOk: preBodyDiagnostics.previewModeOk,
      retryable: retryDiagnostics.retryable,
      retryAfterOk: retryDiagnostics.retryAfterOk,
    });
    throw new PreviewGuestAnswerUnavailable();
  } catch (err) {
    // A violation thrown by validatePreBodyHeaders happens before readBoundedResponseBody is
    // ever called, so the body is still unread — without this, the connection would stay open
    // until garbage collection instead of being released immediately. Any later failure has
    // already disturbed the body (bodyUsed is true by then), so this is a no-op there.
    if (response && !response.bodyUsed) {
      await response.body?.cancel().catch(() => undefined);
    }
    if (
      err instanceof PreviewResponseHeaderViolation ||
      err instanceof PreviewResponseTooLarge ||
      err instanceof PreviewResponseInvalidEncoding
    ) {
      console.warn("[lucy-preview] response failed a hard validation check:", err.message);
    }
    if (err instanceof PreviewGuestAnswerUnavailable) throw err;
    throw new PreviewGuestAnswerUnavailable();
  } finally {
    clearTimeout(timeout);
  }
}
