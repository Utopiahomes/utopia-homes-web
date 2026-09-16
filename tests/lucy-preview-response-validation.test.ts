import { describe, expect, it } from "vitest";
import {
  PreviewMarkerMissing,
  PreviewResponseTooLarge,
  PreviewSetCookiePresent,
  readBoundedResponseBody,
  validateResponseHeaders,
} from "@/lib/lucy-preview/response-validation";

const REQUEST_ID = "5a6a3c4e-1b2c-4d5e-89ab-1234567890ab";

function wellFormedHeaders(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    "content-type": "application/json",
    "cache-control": "no-store",
    "x-request-id": REQUEST_ID,
    "x-utopia-business-release": "homes-business:release:test.1",
    "x-utopia-knowledge-release": "homes-knowledge:release:test.1",
    "x-utopia-preview-mode": "legacy-bridge",
    ...overrides,
  };
}

describe("validateResponseHeaders", () => {
  it("reports every diagnostic as ok for a well-formed response", () => {
    const response = new Response("{}", { headers: wellFormedHeaders() });
    const diagnostics = validateResponseHeaders(response, REQUEST_ID);
    expect(diagnostics).toEqual({
      contentTypeOk: true,
      cacheControlOk: true,
      requestIdEchoOk: true,
      businessReleasePresent: true,
      knowledgeReleasePresent: true,
      retryAfterOk: null,
      previewModeValue: "legacy-bridge",
    });
  });

  it("throws PreviewMarkerMissing when the preview marker is absent", () => {
    const headers = wellFormedHeaders();
    delete headers["x-utopia-preview-mode"];
    const response = new Response("{}", { headers });
    expect(() => validateResponseHeaders(response, REQUEST_ID)).toThrow(PreviewMarkerMissing);
  });

  it("throws PreviewMarkerMissing when the preview marker has the wrong value", () => {
    const response = new Response(
      "{}",
      { headers: wellFormedHeaders({ "x-utopia-preview-mode": "conformant" }) },
    );
    expect(() => validateResponseHeaders(response, REQUEST_ID)).toThrow(PreviewMarkerMissing);
  });

  it("throws PreviewSetCookiePresent when a cookie is set", () => {
    const response = new Response("{}", {
      headers: [...Object.entries(wellFormedHeaders()), ["set-cookie", "session=abc"]],
    });
    expect(() => validateResponseHeaders(response, REQUEST_ID)).toThrow(PreviewSetCookiePresent);
  });

  it("reports a mismatched X-Request-ID echo as a diagnostic, not a thrown error", () => {
    const response = new Response(
      "{}",
      { headers: wellFormedHeaders({ "x-request-id": "00000000-0000-4000-8000-000000000000" }) },
    );
    const diagnostics = validateResponseHeaders(response, REQUEST_ID);
    expect(diagnostics.requestIdEchoOk).toBe(false);
  });

  it("reports missing release headers as a diagnostic, not a thrown error", () => {
    const headers = wellFormedHeaders();
    delete headers["x-utopia-business-release"];
    const response = new Response("{}", { headers });
    const diagnostics = validateResponseHeaders(response, REQUEST_ID);
    expect(diagnostics.businessReleasePresent).toBe(false);
    expect(diagnostics.knowledgeReleasePresent).toBe(true);
  });

  it("validates Retry-After bounds (1-30) only when the header is present", () => {
    const withRetryAfter = new Response(
      "{}",
      { headers: wellFormedHeaders({ "retry-after": "15" }) },
    );
    expect(validateResponseHeaders(withRetryAfter, REQUEST_ID).retryAfterOk).toBe(true);

    const withInvalidRetryAfter = new Response(
      "{}",
      { headers: wellFormedHeaders({ "retry-after": "31" }) },
    );
    expect(validateResponseHeaders(withInvalidRetryAfter, REQUEST_ID).retryAfterOk).toBe(false);

    const withoutRetryAfter = new Response("{}", { headers: wellFormedHeaders() });
    expect(validateResponseHeaders(withoutRetryAfter, REQUEST_ID).retryAfterOk).toBeNull();
  });

  it("accepts a lenient Cache-Control value that still includes no-store", () => {
    const response = new Response(
      "{}",
      { headers: wellFormedHeaders({ "cache-control": "no-store, must-revalidate" }) },
    );
    expect(validateResponseHeaders(response, REQUEST_ID).cacheControlOk).toBe(true);
  });
});

describe("readBoundedResponseBody", () => {
  it("reads a body at or under the 64 KiB bound", async () => {
    const body = "x".repeat(65_536);
    const response = new Response(body);
    await expect(readBoundedResponseBody(response)).resolves.toHaveLength(65_536);
  });

  it("throws PreviewResponseTooLarge for a body over the 64 KiB bound", async () => {
    const response = new Response("x".repeat(65_537));
    await expect(readBoundedResponseBody(response)).rejects.toThrow(PreviewResponseTooLarge);
  });

  it("never JSON-parses an oversized body — the byte check runs first", async () => {
    const oversizedNonJson = "not json at all, and also way too large: " + "x".repeat(65_537);
    const response = new Response(oversizedNonJson);
    await expect(readBoundedResponseBody(response)).rejects.toThrow(PreviewResponseTooLarge);
  });
});
