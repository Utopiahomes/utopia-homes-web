import { createClient } from "@supabase/supabase-js";
import { resolveRetentionService } from "@/lib/retention";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!authorized(request))
    return Response.json({ ok: false }, { status: 401 });
  const url = new URL(request.url);
  const action = url.searchParams.get("action") ?? "status";
  try {
    const result =
      action === "dry-run"
        ? await resolveRetentionService().dryRun()
        : await resolveRetentionService().status();
    return Response.json({ ok: true, result });
  } catch {
    return Response.json(
      { ok: false, message: "Retention control failed." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!authorized(request))
    return Response.json({ ok: false }, { status: 401 });
  const body = (await request.json()) as {
    action?: string;
    id?: string;
    reason?: string;
    createdBy?: string;
  };
  if (body.action === "run") {
    if (process.env.RETENTION_DELETION_ENABLED !== "true")
      return Response.json(
        { ok: false, message: "Deletion is disabled." },
        { status: 409 },
      );
    return Response.json({
      ok: true,
      result: await resolveRetentionService().run(false),
    });
  }
  if (
    !body.id ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.id,
    )
  )
    return Response.json(
      { ok: false, message: "A valid record ID is required." },
      { status: 400 },
    );
  const client = serverClient();
  const calls: Record<string, [string, Record<string, unknown>]> = {
    "delete-record": ["request_design_quote_deletion", { p_id: body.id }],
    "place-legal-hold": [
      "place_design_quote_legal_hold",
      {
        p_id: body.id,
        p_reason: body.reason ?? "",
        p_created_by: body.createdBy ?? "authorized administrator",
      },
    ],
    "release-legal-hold": [
      "release_design_quote_legal_hold",
      { p_id: body.id },
    ],
  };
  const call = body.action ? calls[body.action] : undefined;
  if (!call)
    return Response.json(
      { ok: false, message: "Unknown action." },
      { status: 400 },
    );
  const { error } = await client.rpc(call[0], call[1]);
  if (error)
    return Response.json(
      { ok: false, message: "Retention control failed." },
      { status: 500 },
    );
  return Response.json({ ok: true });
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret?.trim() &&
    request.headers.get("authorization") === `Bearer ${secret}`,
  );
}
function serverClient() {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
