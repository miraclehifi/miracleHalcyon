// @ts-check
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server",
  // 图片由 R2 原样输出（ADR-005），不需要 Cloudflare Images 变换
  adapter: cloudflare({ imageService: "passthrough" }),
  // 会话存 D1（ADR-003），不启用 Astro 内置的 KV 会话
  session: false,
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
