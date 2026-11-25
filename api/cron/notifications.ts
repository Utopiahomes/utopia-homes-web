import { notificationService } from "../../lib/notifications/index.js";

// GET /api/cron/notifications: retries due notifications. Not scheduled in vercel.json (the daily
// maintenance job does this too); callable with the cron secret. Moved from
// app/api/cron/notifications/route.ts; maxDuration 60 is set in vercel.json "functions".

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim() || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ ok: false }, { status: 401 });
  try {
    const result = await notificationService.retryDue();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Notification retry worker failed", error instanceof Error ? error.message : "Unknown worker error");
    return Response.json({ ok: false, message: "Notification retry worker failed." }, { status: 500 });
  }
}
