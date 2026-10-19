import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { createAuthMiddleware } from "../../../src/middleware";
import { createOrphansHandler } from "../../../src/pages/api/admin/storage/orphans";
import { clearAll, imageKey, NOW, seedImages, seedPosts } from "./storage-fixtures";

// GET /api/admin/storage/orphans（media api-contract，F-006 US-01）
const SITE = "http://localhost:4321";
const handler = createOrphansHandler({ db: env.DB, bucket: env.MEDIA, now: () => NOW });

async function call() {
  const request = new Request(`${SITE}/api/admin/storage/orphans`);
  const response = await handler({ request, url: new URL(request.url) } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

afterEach(clearAll);

describe("GET /api/admin/storage/orphans", () => {
  it("[TC-US01-04][SC-DETECT-06] 未引用图片及其视频：逐字段契约", async () => {
    await seedImages([{ key: imageKey(1), size: 1000, videoSize: 5000 }]);
    const { status, body } = await call();

    expect({ status, body }).toEqual({
      status: 200,
      body: {
        summary: { orphanImageCount: 1, orphanImageBytes: 1000, orphanVideoCount: 0, orphanVideoBytes: 0, totalOrphanBytes: 6000, protectedCount: 0 },
        checkedAt: NOW.toISOString(),
      },
    });
  });

  it("[TC-US01-06][SC-DETECT-09] 24 小时保护期边界：23h59m / 1h 不计入并计入 protectedCount；24h1m 计入；已引用不计", async () => {
    const [n1, n2, n3, n4] = [1, 2, 3, 4].map((n) => imageKey(n));
    await seedImages([
      { key: n1, ageHours: 23 + 59 / 60 },
      { key: n2, ageHours: 1, videoSize: 10 },
      { key: n3, ageHours: 24 + 1 / 60 },
      { key: n4, ageHours: 1 },
    ]);
    await seedPosts([{ body: `![x](/${n2}) ![y](/${n4})` }]);
    const { body } = await call();

    expect(body.summary).toMatchObject({ orphanImageCount: 1, orphanVideoCount: 0, protectedCount: 2 });
  });

  it("[TC-US01-08][SC-DETECT-16] 未登录：middleware 返回 401 UNAUTHENTICATED，不进入处理", async () => {
    const middleware = createAuthMiddleware({ getSession: async () => null, siteOrigin: SITE, now: () => NOW });
    let reached = false;
    for (const token of [undefined, "expired-token"]) {
      const request = new Request(`${SITE}/api/admin/storage/orphans`);
      const context = { request, url: new URL(request.url), cookies: { get: () => (token ? { value: token } : undefined) }, locals: {} } as unknown as APIContext;
      const response = (await middleware(context, async () => {
        reached = true;
        return new Response("ok");
      })) as Response;
      expect([response.status, ((await response.json()) as { error: { code: string } }).error.code]).toEqual([401, "UNAUTHENTICATED"]);
    }
    expect(reached).toBe(false);
  });
});
