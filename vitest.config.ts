import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const MIGRATIONS_DIR = "src/db/migrations";

export default defineConfig({
  test: {
    projects: [
      {
        // 纯函数、React 组件：Node + jsdom
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          environment: "jsdom",
        },
      },
      {
        // 领域服务、仓储、API：workerd + 本地 D1 / R2（每个测试文件存储隔离）
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: { TEST_MIGRATIONS: await readD1Migrations(MIGRATIONS_DIR) },
            },
          })),
        ],
        test: {
          name: "workers",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/setup/apply-migrations.ts"],
        },
      },
    ],
  },
});
