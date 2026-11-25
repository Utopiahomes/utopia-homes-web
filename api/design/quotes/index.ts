import { checkRateLimit } from "../../../lib/forms/rate-limit.js";
import { generateDesignQuote } from "../../../lib/design/service.js";
import { clientIp } from "../../_lib/http.js";

// POST /api/design/quotes: the design estimate. Moved from app/api/design/quotes/route.ts.

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  if (!checkRateLimit(`${ip}:design-quote`, 8, 60_000)) return Response.json({ ok: false, message: "Too many estimate attempts. Please wait a minute and try again." }, { status: 429 });
  const result = await generateDesignQuote(await request.json().catch(() => null));
  return Response.json(result, { status: result.status });
}
