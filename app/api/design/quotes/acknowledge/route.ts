import { type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/forms/rate-limit";
import { acknowledgeDesignQuote } from "@/lib/design/service";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!checkRateLimit(`${ip}:design-acknowledgment`, 5, 60_000)) return Response.json({ ok: false, message: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  const result = await acknowledgeDesignQuote(await request.json().catch(() => null));
  return Response.json(result, { status: result.status });
}
