/**
 * Server-side-only validation of the guest.answer@1.0 response wire shape this preview consumer
 * receives: the raw byte bound (RC2 Section 6) and an explicit allowlist of RC2-required and
 * diagnostic response headers (RC2 Sections 8/12, the Tier A exchange vectors, and this
 * repo's own preconformant-preview marker).
 *
 * The boundary Control-side review asked for: read and validate these headers here, server-side,
 * so Stage 1 can accurately claim protocol-preview coverage — but never forward any header or
 * this module's diagnostics into the browser-facing response or analytics. Only `askPreviewGuestAnswer`
 * (lib/lucy-preview/server.ts) calls this; the API route only ever sees its `{ok, answer}` shape.
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

export class PreviewMarkerMissing extends Error {
  constructor() {
    super("Provider response is missing the required X-Utopia-Preview-Mode marker");
  }
}

export class PreviewSetCookiePresent extends Error {
  constructor() {
    super("Provider response unexpectedly set a cookie");
  }
}

/** Content-free: booleans and short enum-like strings only, never header raw values beyond the
 * marker itself (which is a fixed, non-sensitive constant, not guest content). Safe to log
 * server-side; still must never be sent to the browser or an analytics event. */
export interface PreviewResponseDiagnostics {
  contentTypeOk: boolean;
  cacheControlOk: boolean;
  requestIdEchoOk: boolean;
  businessReleasePresent: boolean;
  knowledgeReleasePresent: boolean;
  retryAfterOk: boolean | null; // null when the header is absent (not applicable to this response).
  previewModeValue: string | null;
}

/**
 * Reads the response body as bounded raw bytes, enforcing RC2's 64 KiB response cap BEFORE any
 * JSON parsing happens — never parse-then-check. Throws PreviewResponseTooLarge if exceeded; an
 * oversized body is itself a provider conformance violation, not something to truncate and parse
 * anyway.
 */
export async function readBoundedResponseBody(response: Response): Promise<string> {
  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > RESPONSE_MAX_BYTES) throw new PreviewResponseTooLarge();
  return new TextDecoder("utf-8").decode(buffer);
}

function getSetCookieValues(headers: Headers): string[] {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  return typeof getSetCookie === "function" ? getSetCookie.call(headers) : [];
}

/**
 * Validates the RC2-required/diagnostic response header allowlist. Returns a content-free
 * diagnostics object for the caller to log server-side only.
 *
 * Throws only for the subset of checks serious enough to fail the whole call: an unexpected
 * Set-Cookie (never acceptable from this provider — a real security concern, not a protocol
 * nicety) and a missing/wrong preview marker (this consumer exists only to talk to the Stage-1
 * preview provider; a response without that exact marker means either a misconfigured
 * PREVIEW_GUEST_ANSWER_PROVIDER_URL or a provider that has changed identity, and this route must
 * not trust it either way). Every other mismatch is recorded in the returned diagnostics rather
 * than failing the call — Stage 1's purpose is surfacing live conformance information, not being
 * maximally fragile about a single header during staff testing.
 */
export function validateResponseHeaders(
  response: Response,
  expectedRequestId: string,
): PreviewResponseDiagnostics {
  const headers = response.headers;

  if (getSetCookieValues(headers).length > 0 || headers.has("set-cookie")) {
    throw new PreviewSetCookiePresent();
  }

  const previewModeValue = headers.get("x-utopia-preview-mode");
  if (previewModeValue !== EXPECTED_PREVIEW_MODE) {
    throw new PreviewMarkerMissing();
  }

  const contentType = (headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
  const cacheControlDirectives = (headers.get("cache-control") ?? "")
    .split(",")
    .map((part) => part.trim().toLowerCase());
  const retryAfter = headers.get("retry-after");

  return {
    contentTypeOk: contentType === "application/json",
    cacheControlOk: cacheControlDirectives.includes("no-store"),
    requestIdEchoOk: headers.get("x-request-id") === expectedRequestId,
    businessReleasePresent: RELEASE_ID_RE.test(headers.get("x-utopia-business-release") ?? ""),
    knowledgeReleasePresent: RELEASE_ID_RE.test(headers.get("x-utopia-knowledge-release") ?? ""),
    retryAfterOk: retryAfter === null ? null : RETRY_AFTER_RE.test(retryAfter),
    previewModeValue,
  };
}
