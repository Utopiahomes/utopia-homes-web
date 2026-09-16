import { describe, expect, it } from "vitest";
import {
  PreviewResponseHeaderViolation,
  PreviewResponseInvalidEncoding,
  PreviewResponseTooLarge,
  readBoundedResponseBody,
  validatePreBodyHeaders,
  validateRetryableErrorHeaders,
  validateSuccessReleaseHeaders,
} from "@/lib/lucy-preview/response-validation";

const REQUEST_ID = "5a6a3c4e-1b2c-4d5e-89ab-1234567890ab";
const RESPONSE_TOO_LARGE = 65_537;

function wellFormedHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-request-id": REQUEST_ID,
    "x-utopia-preview-mode": "legacy-bridge",
    ...overrides,
  };
}

describe("validatePreBodyHeaders", () => {
  it("returns diagnostics without throwing for a well-formed response", () => {
    const response = new Response("{}", { headers: wellFormedHeaders() });
    expect(validatePreBodyHeaders(response, REQUEST_ID)).toEqual({
      contentTypeOk: true,
      cacheControlOk: true,
      setCookieAbsent: true,
      requestIdEchoOk: true,
      previewModeOk: true,
      previewModeValue: "legacy-bridge",
    });
  });

  it("fails closed on a wrong Content-Type", () => {
    const response = new Response("{}", { headers: wellFormedHeaders({ "content-type": "text/html" }) });
    expect(() => validatePreBodyHeaders(response, REQUEST_ID)).toThrow(PreviewResponseHeaderViolation);
    try {
      validatePreBodyHeaders(response, REQUEST_ID);
    } catch (err) {
      expect(err).toBeInstanceOf(PreviewResponseHeaderViolation);
      expect((err as PreviewResponseHeaderViolation).reasons).toContain("content_type");
    }
  });

  it("fails closed when Cache-Control is missing no-store", () => {
    const response = new Response("{}", { headers: wellFormedHeaders({ "cache-control": "public" }) });
    try {
      validatePreBodyHeaders(response, REQUEST_ID);
      expect.unreachable();
    } catch (err) {
      expect((err as PreviewResponseHeaderViolation).reasons).toContain("cache_control");
    }
  });

  it("accepts a Cache-Control value that includes no-store alongside other directives", () => {
    const response = new Response(
      "{}",
      { headers: wellFormedHeaders({ "cache-control": "no-store, must-revalidate" }) },
    );
    expect(validatePreBodyHeaders(response, REQUEST_ID).cacheControlOk).toBe(true);
  });

  it("fails closed when a Set-Cookie is present", () => {
    const response = new Response("{}", {
      headers: [...Object.entries(wellFormedHeaders()), ["set-cookie", "session=abc"]],
    });
    try {
      validatePreBodyHeaders(response, REQUEST_ID);
      expect.unreachable();
    } catch (err) {
      expect((err as PreviewResponseHeaderViolation).reasons).toContain("set_cookie");
    }
  });

  it("fails closed on an X-Request-ID echo mismatch", () => {
    const response = new Response(
      "{}",
      { headers: wellFormedHeaders({ "x-request-id": "00000000-0000-4000-8000-000000000000" }) },
    );
    try {
      validatePreBodyHeaders(response, REQUEST_ID);
      expect.unreachable();
    } catch (err) {
      expect((err as PreviewResponseHeaderViolation).reasons).toContain("request_id_mismatch");
    }
  });

  it("fails closed when the preview marker is absent", () => {
    const headers = wellFormedHeaders();
    delete headers["x-utopia-preview-mode"];
    const response = new Response("{}", { headers });
    try {
      validatePreBodyHeaders(response, REQUEST_ID);
      expect.unreachable();
    } catch (err) {
      expect((err as PreviewResponseHeaderViolation).reasons).toContain("preview_marker");
    }
  });

  it("fails closed when the preview marker has the wrong value", () => {
    const response = new Response(
      "{}",
      { headers: wellFormedHeaders({ "x-utopia-preview-mode": "conformant" }) },
    );
    try {
      validatePreBodyHeaders(response, REQUEST_ID);
      expect.unreachable();
    } catch (err) {
      expect((err as PreviewResponseHeaderViolation).reasons).toContain("preview_marker");
    }
  });

  it("reports every violated check at once, not just the first", () => {
    const response = new Response("{}", {
      headers: wellFormedHeaders({ "content-type": "text/html", "cache-control": "public" }),
    });
    try {
      validatePreBodyHeaders(response, REQUEST_ID);
      expect.unreachable();
    } catch (err) {
      const reasons = (err as PreviewResponseHeaderViolation).reasons;
      expect(reasons).toContain("content_type");
      expect(reasons).toContain("cache_control");
    }
  });
});

describe("validateSuccessReleaseHeaders", () => {
  it("passes when both release headers are present and valid", () => {
    const response = new Response("{}", {
      headers: {
        "x-utopia-business-release": "homes-business:release:test.1",
        "x-utopia-knowledge-release": "homes-knowledge:release:test.1",
      },
    });
    expect(validateSuccessReleaseHeaders(response)).toEqual({
      businessReleasePresent: true,
      knowledgeReleasePresent: true,
    });
  });

  it("fails closed when a release header is missing", () => {
    const response = new Response("{}", {
      headers: { "x-utopia-knowledge-release": "homes-knowledge:release:test.1" },
    });
    expect(() => validateSuccessReleaseHeaders(response)).toThrow(PreviewResponseHeaderViolation);
  });
});

describe("validateRetryableErrorHeaders", () => {
  it("is a no-op (not applicable) when the error is not retryable", () => {
    const response = new Response("{}");
    const body = { contract_version: "1.0", error: { code: "invalid_request", retryable: false } };
    expect(validateRetryableErrorHeaders(response, body)).toEqual({
      retryable: false,
      retryAfterOk: null,
    });
  });

  it("passes when a retryable error carries a valid Retry-After", () => {
    const response = new Response("{}", { headers: { "retry-after": "15" } });
    const body = { contract_version: "1.0", error: { code: "rate_limited", retryable: true } };
    expect(validateRetryableErrorHeaders(response, body)).toEqual({
      retryable: true,
      retryAfterOk: true,
    });
  });

  it("fails closed when a retryable error is missing Retry-After", () => {
    const response = new Response("{}");
    const body = { contract_version: "1.0", error: { code: "rate_limited", retryable: true } };
    expect(() => validateRetryableErrorHeaders(response, body)).toThrow(
      PreviewResponseHeaderViolation,
    );
  });

  it("fails closed when a retryable error's Retry-After is out of the 1-30 bound", () => {
    const response = new Response("{}", { headers: { "retry-after": "31" } });
    const body = { contract_version: "1.0", error: { code: "rate_limited", retryable: true } };
    expect(() => validateRetryableErrorHeaders(response, body)).toThrow(
      PreviewResponseHeaderViolation,
    );
  });

  it("never touches the error body beyond the retryable boolean", () => {
    const response = new Response("{}", { headers: { "retry-after": "15" } });
    const body = {
      contract_version: "1.0",
      error: { code: "rate_limited", message: "sensitive internal detail", retryable: true },
    };
    const diagnostics = validateRetryableErrorHeaders(response, body);
    expect(JSON.stringify(diagnostics)).not.toContain("sensitive");
  });
});

describe("readBoundedResponseBody", () => {
  it("reads a body at or under the 64 KiB bound", async () => {
    const body = "x".repeat(65_536);
    const response = new Response(body);
    await expect(readBoundedResponseBody(response)).resolves.toHaveLength(65_536);
  });

  it("throws PreviewResponseTooLarge for a body over the 64 KiB bound, without buffering it whole", async () => {
    const response = new Response("x".repeat(65_537));
    await expect(readBoundedResponseBody(response)).rejects.toThrow(PreviewResponseTooLarge);
  });

  it("rejects based on a declared Content-Length before reading, when present and oversized", async () => {
    let bodyWasRead = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        bodyWasRead = true;
        controller.enqueue(new TextEncoder().encode("x".repeat(100)));
        controller.close();
      },
    });
    const response = new Response(stream, {
      headers: { "content-length": String(RESPONSE_TOO_LARGE) },
    });
    await expect(readBoundedResponseBody(response)).rejects.toThrow(PreviewResponseTooLarge);
    expect(bodyWasRead).toBe(false);
  });

  it("throws PreviewResponseInvalidEncoding for malformed UTF-8 instead of silently substituting", async () => {
    const invalidUtf8 = new Uint8Array([0xff, 0xfe, 0xfd]);
    const response = new Response(invalidUtf8);
    await expect(readBoundedResponseBody(response)).rejects.toThrow(PreviewResponseInvalidEncoding);
  });

  it("accepts valid UTF-8 including multi-byte characters", async () => {
    const response = new Response("héllo wörld — 日本語");
    await expect(readBoundedResponseBody(response)).resolves.toBe("héllo wörld — 日本語");
  });

  it("rejects a body with a leading byte-order mark instead of silently stripping it", async () => {
    // RFC 8259 Section 8.1: a JSON producer MUST NOT emit a BOM. ignoreBOM: true keeps the BOM
    // in the decoded string so JSON.parse rejects it downstream, rather than TextDecoder's
    // default of silently stripping it and letting an RC2-noncompliant body parse as if clean.
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const json = new TextEncoder().encode('{"a":1}');
    const withBom = new Uint8Array(bom.length + json.length);
    withBom.set(bom, 0);
    withBom.set(json, bom.length);
    const response = new Response(withBom);
    const decoded = await readBoundedResponseBody(response);
    expect(decoded.charCodeAt(0)).toBe(0xfeff); // BOM survives decode...
    expect(() => JSON.parse(decoded)).toThrow(); // ...so JSON.parse is the thing that rejects it.
  });
});
