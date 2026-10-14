import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const MIGRATIONS_DIR = "src/db/migrations";

export default defineConfig({
  resolve: {
    // postcss（Expressive Code 依赖）是 CJS，require("nanoid/non-secure") 在测试模块回退中
    // 会解析到 ESM 入口而得到 undefined；只影响测试环境，wrangler 打包不受影响
    alias: { "nanoid/non-secure": fileURLToPath(import.meta.resolve("nanoid/non-secure")).replace(/\.js$/, ".cjs") },
  },
  test: {
    projects: [
      {
        // 纯函数、React 组件：Node + jsdom
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["tests/setup/jsdom.ts"],
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
          include: ["tests/integration/**/*.test.ts", "tests/spike/**/*.test.ts"],
          setupFiles: ["tests/setup/apply-migrations.ts"],
        },
      },
    ],
  },
});
