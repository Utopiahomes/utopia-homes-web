import { notificationService } from "@/lib/notifications";
import { resolveRetentionService } from "@/lib/retention";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
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
