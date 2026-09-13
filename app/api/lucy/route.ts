import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/forms/rate-limit";
import { publicLucyQuestionSchema, type PublicLucyResponse } from "@/lib/lucy/contracts";
import {
  askPublicLucy,
  isPublicLucyEnabled,
  resolvePublicLucyConfiguration,
} from "@/lib/lucy/server";

const MAX_REQUEST_BYTES = 8_192;
const SESSION_COOKIE = "utopia_lucy_session";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: PublicLucyResponse, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

function attachSession(
  response: NextResponse,
  request: NextRequest,
  existingSession: string | undefined,
  sessionId: string,
) {
  if (!existingSession || existingSession !== sessionId) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      maxAge: 3_600,
      path: "/",
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
    });
  }
  return response;
}

export async function POST(request: NextRequest) {
  if (!isPublicLucyEnabled()) {
    return json({ ok: false, message: "Lucy is not available yet." }, 503);
  }
  let siteHostname: string;
  try {
    siteHostname = resolvePublicLucyConfiguration().siteHostname;
  } catch {
    return json(
      { ok: false, message: "Lucy is taking a quiet moment. Please try again shortly." },
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

  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const sessionId = existingSession && UUID.test(existingSession) ? existingSession : randomUUID();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (
    !checkRateLimit(`lucy:ip:${ip}`, 20, 60_000) ||
    !checkRateLimit(`lucy:session:${sessionId}`, 30, 60_000)
  ) {
    return attachSession(
      json({ ok: false, message: "Lucy has received too many questions. Please wait a minute." }, 429),
      request,
      existingSession,
      sessionId,
    );
  }

  try {
    const result = await askPublicLucy(parsed.data.question, sessionId, {
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
        { ok: false, message: "Lucy is taking a quiet moment. Please try again shortly." },
        503,
      ),
      request,
      existingSession,
      sessionId,
    );
  }
}
