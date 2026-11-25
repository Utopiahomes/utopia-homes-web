import { checkRateLimit } from "../../../lib/forms/rate-limit.js";
import { acknowledgeDesignQuote } from "../../../lib/design/service.js";
import { clientIp } from "../../_lib/http.js";

// POST /api/design/quotes/acknowledge. Moved from app/api/design/quotes/acknowledge/route.ts.

export async function POST(request: Request): Promise<Response> {
  const ip = clientIp(request);
  if (!checkRateLimit(`${ip}:design-acknowledgment`, 5, 60_000)) return Response.json({ ok: false, message: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  const result = await acknowledgeDesignQuote(await request.json().catch(() => null));
  return Response.json(result, { status: result.status });
}
