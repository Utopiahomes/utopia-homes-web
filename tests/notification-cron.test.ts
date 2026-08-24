import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/cron/notifications/route";

describe("notification retry cron", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("rejects requests without the configured bearer secret", async () => {
    vi.stubEnv("CRON_SECRET", "a-long-random-test-secret");
    const response = await GET(new Request("http://localhost/api/cron/notifications"));
    expect(response.status).toBe(401);
  });

  it("accepts Vercel's bearer secret and can safely report disabled delivery", async () => {
    vi.stubEnv("CRON_SECRET", "a-long-random-test-secret");
    vi.stubEnv("EMAIL_PROVIDER", "proton");
    vi.stubEnv("PROTON_SMTP_TOKEN", "");
    const response = await GET(new Request("http://localhost/api/cron/notifications", { headers: { Authorization: "Bearer a-long-random-test-secret" } }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, disabled: true, claimed: 0 });
  });
});
