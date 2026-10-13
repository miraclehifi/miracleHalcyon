// @ts-check
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";

/**
 * spike 测试页只在 dev 下注入路由，不进生产构建（playwright.spike.config.ts 使用）
 * @type {import("astro").AstroIntegration}
 */
const spikeRoutes = {
  name: "spike-routes",
  hooks: {
    "astro:config:setup": ({ command, injectRoute }) => {
      if (command !== "dev") return;
      injectRoute({ pattern: "/_spike/markdown", entrypoint: "./src/pages/admin/_spike-markdown.astro" });
    },
  },
};

export default defineConfig({
  output: "server",
  // 图片由 R2 原样输出（ADR-005），不需要 Cloudflare Images 变换
  adapter: cloudflare({ imageService: "passthrough" }),
  // 会话存 D1（ADR-003），不启用 Astro 内置的 KV 会话
  session: false,
  integrations: [react(), spikeRoutes],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      // remark-parse 的依赖在 browser 条件下用 index.dom.js（顶层访问 document），
      // 预览渲染跑在 Web Worker 里没有 document，改用与 Node / workerd 相同的入口
      alias: { "decode-named-character-reference": fileURLToPath(import.meta.resolve("decode-named-character-reference")) },
    },
    // dev：Web Worker 的依赖不会被启动扫描发现，首次加载时触发预构建会重载页面
    optimizeDeps: {
      include: ["rehype-expressive-code", "rehype-raw", "rehype-sanitize", "rehype-stringify", "remark-gfm", "remark-parse", "remark-rehype", "unified", "unist-util-visit"],
    },
  },
});
