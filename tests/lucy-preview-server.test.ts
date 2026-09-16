import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { askPreviewGuestAnswer, PreviewGuestAnswerUnavailable } from "@/lib/lucy-preview/server";

const { privateKey } = generateKeyPairSync("ed25519");
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }) as string;

const enabledEnv = {
  PREVIEW_GUEST_ANSWER_ENABLED: "true",
  PREVIEW_GUEST_ANSWER_PROVIDER_URL: "https://provider.example/business/v1/guest/answer",
  PREVIEW_GUEST_ANSWER_JWT_PRIVATE_KEY_PEM: privateKeyPem,
  PREVIEW_GUEST_ANSWER_JWT_KID: "test-key-1",
};

describe("askPreviewGuestAnswer — response hygiene", () => {
  it("cancels an unread body when a pre-body header violation is found, instead of leaving the connection open", async () => {
    const cancelSpy = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{}"));
        controller.close();
      },
      cancel(...args) {
        cancelSpy(...args);
      },
    });
    // Wrong Content-Type triggers a Phase 1 (pre-body) violation, so the body must never be read
    // — this response's stream should be cancelled, not silently abandoned.
    const response = new Response(stream, {
      status: 200,
      headers: {
        "content-type": "text/html",
        "cache-control": "no-store",
        "x-utopia-preview-mode": "legacy-bridge",
      },
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);

    await expect(
      askPreviewGuestAnswer("What time is check-in?", "1db886ff-7d89-4aa7-b9a1-083a98b80702", {
        env: enabledEnv,
        fetcher,
      }),
    ).rejects.toThrow(PreviewGuestAnswerUnavailable);

    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });

  it("does not attempt to cancel again once the body has already been fully read", async () => {
    const cancelSpy = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            JSON.stringify({
              contract_version: "1.0",
              response_id: "a9ec2c26-cf3d-4a58-9939-cd421db25d71",
              session_id: "27b20c7b-777e-4af3-8db1-5fe1fc2f3b7e",
              assistant_turn_id: "ed1f1cfa-125c-4178-ae7d-dbc527a14863",
              outcome: "answered",
              answer: "Check-in is at 4pm.",
              sources: [],
              actions: [],
              limitations: [],
            }),
          ),
        );
        controller.close();
      },
      cancel(...args) {
        cancelSpy(...args);
      },
    });
    // X-Request-ID is generated fresh inside askPreviewGuestAnswer, so it can't be a fixed
    // fixture value — echo whatever the outgoing request actually sent, matching what a real
    // conformant provider does.
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      const sentRequestId = new Headers(init?.headers).get("x-request-id") ?? "";
      return new Response(stream, {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
          "x-request-id": sentRequestId,
          "x-utopia-preview-mode": "legacy-bridge",
          "x-utopia-business-release": "homes-business:release:test.1",
          "x-utopia-knowledge-release": "homes-knowledge:release:test.1",
        },
      });
    });

    await expect(
      askPreviewGuestAnswer("What time is check-in?", "1db886ff-7d89-4aa7-b9a1-083a98b80702", {
        env: enabledEnv,
        fetcher,
      }),
    ).resolves.toEqual({ answer: "Check-in is at 4pm." });

    expect(cancelSpy).not.toHaveBeenCalled();
  });
});
