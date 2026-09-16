/**
 * Server-side-only validation of the guest.answer@1.0 response wire shape this preview consumer
 * receives: the raw byte bound (RC2 Section 6), valid UTF-8 (RC2 requires UTF-8 JSON), and an
 * explicit allowlist of RC2-required and diagnostic response headers (RC2 Sections 8/12, the
 * Tier A exchange vectors, and this repo's own preconformant-preview marker).
 *
 * Every check here fails closed: an unexpected Set-Cookie, wrong/missing preview marker, wrong
 * Content-Type, missing `no-store`, a request-ID echo mismatch, missing/invalid release headers
 * on a success response, or a retryable error lacking a valid Retry-After all reject the
 * provider's response outright, not merely get recorded as a diagnostic. Diagnostics exist as an
 * audit trail of what was checked, not as a substitute for rejecting a non-conformant response —
 * see PreviewResponseHeaderViolation.
 *
 * Only `askPreviewGuestAnswer` (lib/lucy-preview/server.ts) calls this; the API route only ever
 * sees its `{ok, answer}` shape. Nothing here — no header, no diagnostic, no violation reason —
 * is ever forwarded to the browser or an analytics event.
 */

const RESPONSE_MAX_BYTES = 65_536; // RC2 Section 6: 64 KiB response body cap.
const EXPECTED_PREVIEW_MODE = "legacy-bridge";
const RELEASE_ID_RE = /^[\x21-\x7e]{1,128}$/;
const RETRY_AFTER_RE = /^([1-9]|[12][0-9]|30)$/; // RC2: 1-30 integer seconds.

export class PreviewResponseTooLarge extends Error {
  constructor() {
    super("Provider response exceeded the 64 KiB bound");
  }
}

export class PreviewResponseInvalidEncoding extends Error {
  constructor() {
    super("Provider response body was not valid UTF-8");
  }
}

/** `reasons` is a fixed, non-sensitive enum-like set of short tokens (e.g. "content_type",
 * "set_cookie") — safe to log server-side, never guest content. */
export class PreviewResponseHeaderViolation extends Error {
  readonly reasons: string[];

  constructor(reasons: string[]) {
    super(`Provider response violated required header rule(s): ${reasons.join(", ")}`);
    this.reasons = reasons;
  }
}

export interface PreBodyDiagnostics {
  contentTypeOk: boolean;
  cacheControlOk: boolean;
  setCookieAbsent: boolean;
  requestIdEchoOk: boolean;
  previewModeOk: boolean;
  previewModeValue: string | null;
}

export interface SuccessReleaseDiagnostics {
  businessReleasePresent: boolean;
  knowledgeReleasePresent: boolean;
}

export interface RetryableErrorDiagnostics {
  retryable: boolean;
  retryAfterOk: boolean | null; // null: not applicable (error was not retryable).
}

/**
 * Reads the response body as raw bytes, streaming and enforcing RC2's 64 KiB response cap AS IT
 * READS — the stream is cancelled the moment the running total exceeds the bound, so an
 * oversized response is never fully buffered. A declared `Content-Length` over the bound is
 * rejected before any read at all; an absent or understated one doesn't bypass the streaming
 * check, since a response can lie about or omit Content-Length. Decodes with a FATAL UTF-8
 * decoder — RC2 requires valid UTF-8 JSON, and a lossy decode (the TextDecoder default) would
 * silently substitute replacement characters for malformed bytes instead of rejecting them.
 */
export async function readBoundedResponseBody(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > RESPONSE_MAX_BYTES) {
    await response.body?.cancel().catch(() => undefined);
    throw new PreviewResponseTooLarge();
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > RESPONSE_MAX_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new PreviewResponseTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    // ignoreBOM: true — RFC 8259 Section 8.1 says a JSON producer MUST NOT emit a byte-order
    // mark. TextDecoder's default (ignoreBOM: false) silently *strips* a leading BOM instead of
    // treating it as data, which would tolerate exactly the violation RC2's "valid UTF-8 JSON"
    // requirement rules out. With ignoreBOM: true the BOM survives into the decoded string,
    // JSON.parse then rejects it, and the response is correctly treated as non-conformant.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(combined);
  } catch {
    throw new PreviewResponseInvalidEncoding();
  }
}

/**
 * Header checks available before the body is read — content type, cache control, cookie
 * absence, request-ID echo, and the preview marker. Fails closed: throws
 * PreviewResponseHeaderViolation listing every violated check (not just the first) if any fail.
 */
export function validatePreBodyHeaders(
  response: Response,
  expectedRequestId: string,
): PreBodyDiagnostics {
  const headers = response.headers;

  const contentType = (headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
  const cacheControlDirectives = (headers.get("cache-control") ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase());
  const previewModeValue = headers.get("x-utopia-preview-mode");

  const diagnostics: PreBodyDiagnostics = {
    contentTypeOk: contentType === "application/json",
    cacheControlOk: cacheControlDirectives.includes("no-store"),
    setCookieAbsent: !headers.has("set-cookie"),
    requestIdEchoOk: headers.get("x-request-id") === expectedRequestId,
    previewModeOk: previewModeValue === EXPECTED_PREVIEW_MODE,
    previewModeValue,
  };

  const reasons: string[] = [];
  if (!diagnostics.contentTypeOk) reasons.push("content_type");
  if (!diagnostics.cacheControlOk) reasons.push("cache_control");
  if (!diagnostics.setCookieAbsent) reasons.push("set_cookie");
  if (!diagnostics.requestIdEchoOk) reasons.push("request_id_mismatch");
  if (!diagnostics.previewModeOk) reasons.push("preview_marker");

  if (reasons.length > 0) throw new PreviewResponseHeaderViolation(reasons);
  return diagnostics;
}

/** Success responses (RC2 Section 12) must carry both release headers, format-valid. */
export function validateSuccessReleaseHeaders(response: Response): SuccessReleaseDiagnostics {
  const diagnostics: SuccessReleaseDiagnostics = {
    businessReleasePresent: RELEASE_ID_RE.test(
      response.headers.get("x-utopia-business-release") ?? "",
    ),
    knowledgeReleasePresent: RELEASE_ID_RE.test(
      response.headers.get("x-utopia-knowledge-release") ?? "",
    ),
  };
  if (!diagnostics.businessReleasePresent || !diagnostics.knowledgeReleasePresent) {
    throw new PreviewResponseHeaderViolation(["missing_release_headers"]);
  }
  return diagnostics;
}

/** A retryable error (RC2 Section 17's `retryable: true`) must carry a valid 1-30s Retry-After.
 * `parsedErrorBody` is read only to extract this one boolean — its content never leaves this
 * function, matching the existing no-leak convention for provider error detail. */
export function validateRetryableErrorHeaders(
  response: Response,
  parsedErrorBody: unknown,
): RetryableErrorDiagnostics {
  const retryable =
    typeof parsedErrorBody === "object" &&
    parsedErrorBody !== null &&
    "error" in parsedErrorBody &&
    typeof (parsedErrorBody as { error?: unknown }).error === "object" &&
    (parsedErrorBody as { error: { retryable?: unknown } }).error !== null &&
    (parsedErrorBody as { error: { retryable?: unknown } }).error.retryable === true;

  if (!retryable) return { retryable: false, retryAfterOk: null };

  const retryAfter = response.headers.get("retry-after");
  const retryAfterOk = retryAfter !== null && RETRY_AFTER_RE.test(retryAfter);
  if (!retryAfterOk) throw new PreviewResponseHeaderViolation(["missing_retry_after"]);
  return { retryable: true, retryAfterOk: true };
}
