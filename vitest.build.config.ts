import { defineConfig } from "vitest/config";

// 构建产物检查（npm run test:build，Sprint 4 check-reader-build-output）：真实执行 astro build，不并入 npm test
export default defineConfig({
  test: {
    include: ["tests/build/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 600_000,
    fileParallelism: false,
  },
});
