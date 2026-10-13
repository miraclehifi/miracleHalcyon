import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import astro from "eslint-plugin-astro";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist/", ".astro/", ".wrangler/", "worker-configuration.d.ts", "test-results/", "playwright-report/"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  reactHooks.configs.flat.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  // verify 阶段的 Playwright 验收脚本由 playwright-skill 的 run.js 以 CommonJS 执行
  {
    files: ["specs/**/e2e/*.js"],
    languageOptions: { sourceType: "commonjs" },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
);
