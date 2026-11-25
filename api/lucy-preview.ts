import { randomUUID } from "node:crypto";
import { checkRateLimit } from "../lib/forms/rate-limit.js";
import { previewGuestQuestionSchema } from "../lib/lucy-preview/contracts.js";
import type { PreviewLucyResponse } from "../lib/lucy-preview/contracts.js";
import { askPreviewGuestAnswer, isPreviewGuestAnswerEnabled } from "../lib/lucy-preview/server.js";
import { clientIp, readCookie, sessionCookie } from "./_lib/http.js";

/**
 * ISOLATED PREVIEW ROUTE for guest.answer@1.0 (RC2). Not linked from any guest-facing widget —
 * reachable only by direct/manual calls, matching RC2 §20.2 step 3's "explicitly preconformant
 * compatibility preview using synthetic and staff-only traffic," never public guest traffic. The
 * /api/lucy function (api/lucy.ts) is separate and untouched by this file.
 *
 * Mirrors api/lucy.ts's own framing/rate-limit/session conventions so the two routes are directly
 * comparable, but talks to the new Homes Prime provider (see lib/lucy-preview/server.ts) instead
 * of the legacy FAQ-snapshot endpoint. Moved from app/api/lucy-preview/route.ts.
 */

const MAX_REQUEST_BYTES = 8_192;
const SESSION_COOKIE = "utopia_lucy_preview_session";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: PreviewLucyResponse, status: number) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

function attachSession(
  response: Response,
  request: Request,
  existingSession: string | undefined,
  sessionId: string,
) {
  if (!existingSession || existingSession !== sessionId) {
    response.headers.append("Set-Cookie", sessionCookie(SESSION_COOKIE, sessionId, request));
  }
  return response;
}

export async function POST(request: Request): Promise<Response> {
  if (!isPreviewGuestAnswerEnabled()) {
    return json({ ok: false, message: "The guest.answer preview is not available yet." }, 503);
  }
  if (!sameOrigin(request)) {
    return json({ ok: false, message: "This request is not allowed." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return json({ ok: false, message: "JSON is required." }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, message: "That question is too long." }, 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return json({ ok: false, message: "That question is too long." }, 413);
  }
  const parsed = previewGuestQuestionSchema.safeParse(
    (() => {
      try {
        return JSON.parse(rawBody);
      } catch {
        return null;
      }
    })(),
  );
  if (!parsed.success) {
    return json({ ok: false, message: "Please enter a question of up to 500 characters." }, 400);
  }

  const existingSession = readCookie(request, SESSION_COOKIE);
  const sessionId = existingSession && UUID.test(existingSession) ? existingSession : randomUUID();
  const ip = clientIp(request);
  if (
    !checkRateLimit(`lucy-preview:ip:${ip}`, 20, 60_000) ||
    !checkRateLimit(`lucy-preview:session:${sessionId}`, 30, 60_000)
  ) {
    return attachSession(
      json({ ok: false, message: "Too many questions. Please wait a minute." }, 429),
      request,
      existingSession,
      sessionId,
    );
  }

  try {
    const result = await askPreviewGuestAnswer(parsed.data.question, sessionId);
    return attachSession(json({ ok: true, answer: result.answer }, 200), request, existingSession, sessionId);
  } catch {
    return attachSession(
      json({ ok: false, message: "The preview provider is taking a quiet moment." }, 503),
      request,
      existingSession,
      sessionId,
    );
  }
}
