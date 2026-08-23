import { type NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/forms/rate-limit";
import { schemas, type FormKind } from "@/lib/forms/schemas";
import { submitForm } from "@/lib/forms/submit";
export async function POST(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!(kind in schemas)) return Response.json({ ok: false, message: "Unknown form." }, { status: 404 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!checkRateLimit(`${ip}:${kind}`)) return Response.json({ ok: false, message: "Too many attempts. Please wait a minute and try again." }, { status: 429 });
  const body = await request.json().catch(() => null);
  const result = await submitForm(kind as FormKind, body);
  return Response.json(result, { status: result.status });
}
