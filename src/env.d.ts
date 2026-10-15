/// <reference types="astro/client" />

// Secrets / 环境变量（auth domain-model §6）；本地写在 .dev.vars（见 .dev.vars.example）
declare namespace Cloudflare {
  interface Env {
    ADMIN_USERNAME?: string;
    ADMIN_PASSWORD_HASH?: string;
    SITE_ORIGIN?: string;
  }
}

declare namespace App {
  interface Locals {
    session: import("./domains/auth/session-repo").AdminSession | null;
  }
}

// 读者页构建数据（ADR-007）：只允许 prerender 页面引用
declare module "virtual:reader-data" {
  const data: import("./lib/reader/types").ReaderData;
  export default data;
}
