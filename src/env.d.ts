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

declare module "virtual:reader-data" {
  const data: { posts: Array<{ slug: string; title: string; tags: string[]; body: string }> };
  export default data;
}
