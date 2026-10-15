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
  // 带计时断言的用例（@timing）在常规用例全部结束后单独跑，两个浏览器也不同时跑，避免并行负载拖慢计时
  // 代价：常规项目有失败时 Playwright 会跳过依赖它的计时项目
  // 安卓动态照片上传（live-photo-upload）单独用完整 Chromium 的新 headless（channel "chromium"）：默认的 headless shell 没有 HEVC
  // 解码（ADR-006"验证结果"）。其余用例仍用 headless shell——全部换成完整 Chromium 时，各 worker 同时启动会把机器压满、用例超时
  projects: [
    { name: "chromium", grepInvert: /@timing/, testIgnore: /live-photo-upload\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-media", testMatch: /live-photo-upload\.spec\.ts/, use: { ...devices["Desktop Chrome"], channel: "chromium" } },
    { name: "webkit", grepInvert: /@timing/, use: { ...devices["Desktop Safari"] } },
    { name: "chromium-timing", grep: /@timing/, dependencies: ["chromium", "webkit"], use: { ...devices["Desktop Chrome"] } },
    { name: "webkit-timing", grep: /@timing/, dependencies: ["chromium-timing"], use: { ...devices["Desktop Safari"] } },
  ],
  // 指定 PLAYWRIGHT_ENV 时测已部署环境，不起本地服务
  webServer: process.env.PLAYWRIGHT_ENV
    ? undefined
    : {
        // CLOUDFLARE_ENV=e2e：使用 wrangler.jsonc env.e2e 的测试账号；先把迁移应用到本地 D1、图片夹具写入本地 R2
        command: `npm run db:migrate:local && npm run e2e:seed && npm run build && npm run preview -- --port ${PORT}`,
        env: { CLOUDFLARE_ENV: "e2e" },
        port: PORT,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
