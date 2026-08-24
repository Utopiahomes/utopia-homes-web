import { notificationService } from "@/lib/notifications";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
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
