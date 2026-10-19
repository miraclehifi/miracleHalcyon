import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { createAuthMiddleware } from "../../../src/middleware";
import * as cleanupRoute from "../../../src/pages/api/admin/storage/cleanup";
import { clearAll, imageKey, NOW, seedImages } from "./storage-fixtures";

// [TC-US02-06][SC-CLEANUP-10] 清理接口拒绝未登录与非法来源，不删除任何数据；只导出 POST（其他方法 Astro 返回 405）
const SITE = "http://localhost:4321";

afterEach(clearAll);

describe("POST /api/admin/storage/cleanup 安全", () => {
  it("[TC-US02-06] 无会话 401；跨站 Origin、缺少 Origin 与 Referer 403；数据不变", async () => {
    const key = imageKey(1);
    await seedImages([{ key, r2: true }]);
    let reached = 0;
    const run = async (headers: Record<string, string>, session: boolean) => {
      const middleware = createAuthMiddleware({ getSession: async () => (session ? ({ token: "t" } as never) : null), siteOrigin: SITE, now: () => NOW });
      const request = new Request(`${SITE}/api/admin/storage/cleanup`, { method: "POST", headers });
      const context = { request, url: new URL(request.url), cookies: { get: () => ({ value: "t" }) }, locals: {} } as unknown as APIContext;
      const response = (await middleware(context, async () => {
        reached++;
        return new Response(null, { status: 200 });
      })) as Response;
      return [response.status, ((await response.json()) as { error: { code: string } }).error.code];
    };

    expect({
      guest: await run({ Origin: SITE }, false),
      cross: await run({ Origin: "https://evil.example" }, true),
      noOrigin: await run({}, true),
      reached,
      row: (await env.DB.prepare("SELECT key FROM images").first())?.key,
      object: (await env.MEDIA.head(key)) !== null,
    }).toEqual({ guest: [401, "UNAUTHENTICATED"], cross: [403, "FORBIDDEN_ORIGIN"], noOrigin: [403, "FORBIDDEN_ORIGIN"], reached: 0, row: key, object: true });
  });

  it("[TC-US02-06] 路由只导出 POST（GET 由 Astro 返回 405）", () => {
    expect({ post: typeof cleanupRoute.POST, get: "GET" in cleanupRoute }).toEqual({ post: "function", get: false });
  });
});
