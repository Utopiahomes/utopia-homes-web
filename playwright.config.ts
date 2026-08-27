import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: true,
    env: { DESIGN_QUOTE_STORE: "memory", SUBMISSION_STORE: "memory", NOTIFICATION_EMAIL_ENABLED: "false" },
  },
  use: { baseURL: "http://127.0.0.1:3000" },
});
