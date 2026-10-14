import { defineConfig, devices } from "@playwright/test";

// spike 测试：依赖仅 dev 注入的测试页（astro.config 的 spikeRoutes），只跑 chromium
const PORT = 4322;

export default defineConfig({
  testDir: "tests/spike",
  testMatch: "**/*.spec.ts",
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}` },
  // channel "chromium"：用完整 Chromium 的新 headless；默认的 headless shell 没有 HEVC 解码（spike-browser-media-processing）
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chromium" } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
