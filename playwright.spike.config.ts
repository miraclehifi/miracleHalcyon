import { defineConfig, devices } from "@playwright/test";

// spike 测试：依赖仅 dev 注入的测试页（astro.config 的 spikeRoutes），只跑 chromium
const PORT = 4322;

export default defineConfig({
  testDir: "tests/spike",
  testMatch: "**/*.spec.ts",
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    port: PORT,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
