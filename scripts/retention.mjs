const [action = "status", id, ...rest] = process.argv.slice(2);
const origin = process.env.RETENTION_ADMIN_ORIGIN || "http://127.0.0.1:3000";
const secret = process.env.CRON_SECRET;
if (!secret) throw new Error("CRON_SECRET is required.");
const readActions = new Set(["status", "dry-run"]);
const url = `${origin}/api/admin/retention${readActions.has(action) ? `?action=${action}` : ""}`;
const response = await fetch(url, {
  method: readActions.has(action) ? "GET" : "POST",
  headers: {
    authorization: `Bearer ${secret}`,
    "content-type": "application/json",
  },
  body: readActions.has(action)
    ? undefined
    : JSON.stringify({
        action,
        id,
        reason: rest.join(" "),
        createdBy: process.env.RETENTION_OPERATOR || "retention-cli",
      }),
});
const result = await response.json();
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!response.ok) process.exitCode = 1;
