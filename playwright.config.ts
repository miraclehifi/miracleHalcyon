import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;
const baseURL = process.env.PLAYWRIGHT_ENV ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  // 指定 PLAYWRIGHT_ENV 时测已部署环境，不起本地服务
  webServer: process.env.PLAYWRIGHT_ENV
    ? undefined
    : {
        // CLOUDFLARE_ENV=e2e：使用 wrangler.jsonc env.e2e 的测试账号；先把迁移应用到本地 D1
        command: `npm run db:migrate:local && npm run build && npm run preview -- --port ${PORT}`,
        env: { CLOUDFLARE_ENV: "e2e" },
        port: PORT,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
