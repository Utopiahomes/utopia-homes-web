import { randomUUID } from "node:crypto";
import { checkRateLimit } from "../lib/forms/rate-limit.js";
import { publicLucyQuestionSchema, type PublicLucyResponse } from "../lib/lucy/contracts.js";
import { askHomesPrime, isHomesPrimeBackend } from "../lib/lucy/homes-prime.js";
import {
  askPublicLucy,
  isPublicLucyEnabled,
  resolvePublicLucyConfiguration,
} from "../lib/lucy/server.js";
import { clientIp, readCookie, sessionCookie } from "./_lib/http.js";

// POST /api/lucy: the site's Lyra answers. Moved from app/api/lucy/route.ts when the site became
// Astro; NextRequest/NextResponse cookies are replaced by the plain Cookie / Set-Cookie headers.

const SITE_HOSTNAME =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * The site this deployment answers for. With the Homes Prime backend only the hostname binding is
 * needed; the legacy upstream still validates its full configuration, so rolling back to legacy
 * (LUCY_ANSWER_BACKEND unset) needs that configuration to still be present.
 */
function resolveSiteHostname() {
  if (!isHomesPrimeBackend()) return resolvePublicLucyConfiguration().siteHostname;
  const hostname = process.env.LUCY_PUBLIC_SITE_HOSTNAME?.trim().toLowerCase();
  if (!hostname || !SITE_HOSTNAME.test(hostname)) throw new Error("site hostname is not configured");
  return hostname;
}

const MAX_REQUEST_BYTES = 8_192;
const SESSION_COOKIE = "utopia_lucy_session";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: PublicLucyResponse, status: number) {
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
  if (!isPublicLucyEnabled()) {
    return json({ ok: false, message: "Lyra is not available yet." }, 503);
  }
  let siteHostname: string;
  try {
    siteHostname = resolveSiteHostname();
  } catch {
    return json(
      { ok: false, message: "Lyra is taking a quiet moment. Please try again shortly." },
      503,
    );
  }
  if (new URL(request.url).hostname.toLowerCase() !== siteHostname) {
    return json({ ok: false, message: "This request is not allowed." }, 403);
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
  const parsed = publicLucyQuestionSchema.safeParse(
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
    !checkRateLimit(`lucy:ip:${ip}`, 20, 60_000) ||
    !checkRateLimit(`lucy:session:${sessionId}`, 30, 60_000)
  ) {
    return attachSession(
      json({ ok: false, message: "Lyra has received too many questions. Please wait a minute." }, 429),
      request,
      existingSession,
      sessionId,
    );
  }

  try {
    // The operator picks the backend (LUCY_ANSWER_BACKEND); there is no automatic fallback.
    const ask = isHomesPrimeBackend() ? askHomesPrime : askPublicLucy;
    const result = await ask(parsed.data.question, sessionId, {
      pageContext: parsed.data.page_context,
      history: parsed.data.history,
    });
    return attachSession(
      json({ ok: true, ...result }, 200),
      request,
      existingSession,
      sessionId,
    );
  } catch {
    return attachSession(
      json(
        { ok: false, message: "Lyra is taking a quiet moment. Please try again shortly." },
        503,
      ),
      request,
      existingSession,
      sessionId,
    );
  }
}
