export const RETENTION_POLICY_VERSION = "2026-08-29.v3";

export function addCalendarMonths(value: Date, months: number) {
  const result = new Date(value);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function unconvertedRetentionDue(lastMeaningfulActivity: Date) {
  return addCalendarMonths(lastMeaningfulActivity, 12);
}

export function completedProjectDeadlines(completedAt: Date) {
  return {
    core: addCalendarMonths(completedAt, 84),
    uploads: addCalendarMonths(completedAt, 24),
  };
}

export function meaningfulActivityDeadline(
  current: Date,
  activity: { occurredAt: Date; kind: "customer" | "employee" | "automated" },
) {
  return activity.kind === "automated"
    ? current
    : unconvertedRetentionDue(activity.occurredAt);
}
