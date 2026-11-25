import { notificationService } from "../../lib/notifications/index.js";
import { resolveRetentionService } from "../../lib/retention/index.js";

// GET /api/cron/maintenance, run daily by Vercel Cron (vercel.json). Moved from
// app/api/cron/maintenance/route.ts; maxDuration 60 is set in vercel.json "functions".

export async function GET(request: Request): Promise<Response> {
  if (!authorized(request))
    return Response.json({ ok: false }, { status: 401 });
  try {
    const notifications = await notificationService.retryDue();
    const retention = await resolveRetentionService().run();
    return Response.json({ ok: true, notifications, retention });
  } catch (error) {
    console.error("Daily maintenance worker failed", safeMessage(error));
    return Response.json(
      { ok: false, message: "Daily maintenance worker failed." },
      { status: 500 },
    );
  }
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret?.trim() &&
    request.headers.get("authorization") === `Bearer ${secret}`,
  );
}

function safeMessage(error: unknown) {
  return (error instanceof Error ? error.message : "Unknown maintenance error")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "[record]")
    .slice(0, 300);
}
