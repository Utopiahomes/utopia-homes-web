import { randomUUID } from "node:crypto";
import { previewGuestAnswerResponseSchema } from "@/lib/lucy-preview/contracts";
import { PreviewGuestAnswerJwtUnavailable, signPreviewGuestAnswerJwt } from "@/lib/lucy-preview/jwt";

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

  try {
    const response = await (options.fetcher ?? fetch)(providerUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Request-ID": randomUUID(),
        "Idempotency-Key": randomUUID(),
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });

    // Never forward provider error detail (code/message/correlation_id) to the caller — matches
    // the existing /api/lucy route's own no-leak convention for the legacy upstream.
    if (!response.ok) throw new PreviewGuestAnswerUnavailable();

    // Deliberately never read `response.headers` here, including the provider's diagnostic
    // X-Utopia-Preview-Mode header: that header exists for out-of-band operational visibility
    // only and must never reach a public widget or analytics. Only the JSON body is read.
    const payload = await response.json().catch(() => null);
    const result = previewGuestAnswerResponseSchema.safeParse(payload);
    if (!result.success || result.data.outcome !== "answered") {
      throw new PreviewGuestAnswerUnavailable();
    }
    return { answer: result.data.answer };
  } catch (err) {
    if (err instanceof PreviewGuestAnswerUnavailable) throw err;
    throw new PreviewGuestAnswerUnavailable();
  } finally {
    clearTimeout(timeout);
  }
}
