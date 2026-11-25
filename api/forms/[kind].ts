import { checkRateLimit } from "../../lib/forms/rate-limit.js";
import { schemas, type FormKind } from "../../lib/forms/schemas.js";
import { submitForm } from "../../lib/forms/submit.js";
import { clientIp } from "../_lib/http.js";

// POST /api/forms/:kind (contact, owner inquiry, membership, ...). Moved from the Next.js route
// handler app/api/forms/[kind]/route.ts when the site became Astro; same checks and answers.

/** The :kind segment. Vercel may also pass it as ?kind= when it routes a [kind] file. */
function formKind(request: Request) {
  const url = new URL(request.url);
  const segment = url.pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  let kind = segment;
  try {
    kind = decodeURIComponent(segment);
  } catch {
    kind = "";
  }
  if (!kind || kind === "[kind]") kind = url.searchParams.get("kind") ?? "";
  return kind;
}

export async function POST(request: Request): Promise<Response> {
  const kind = formKind(request);
  if (!Object.prototype.hasOwnProperty.call(schemas, kind)) return Response.json({ ok: false, message: "Unknown form." }, { status: 404 });
  const ip = clientIp(request);
  if (!checkRateLimit(`${ip}:${kind}`)) return Response.json({ ok: false, message: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const result = await submitForm(kind as FormKind, body);
  return Response.json(result, { status: result.status });
}
