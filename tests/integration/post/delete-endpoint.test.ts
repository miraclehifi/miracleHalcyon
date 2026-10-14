import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createAuthMiddleware } from "../../../src/middleware";
import { createPostHandlers } from "../../../src/pages/api/admin/posts/[id]";
import { createPublicPostHandler } from "../../../src/pages/api/posts/[slug]";

// DELETE /api/admin/posts/:id（post api-contract §3）
const SITE = "http://localhost:4321";
const NOW = new Date("2026-10-14T03:00:00.000Z");
const handlers = createPostHandlers({ db: env.DB, now: () => NOW });
const readPublic = createPublicPostHandler({ db: env.DB });
const service = createPostService({ repo: new D1PostRepo(env.DB) });
const draft = (slug: string, body = "正文"): DraftInput => ({ title: `T ${slug}`, slug, tags: [], summary: "", body, publishedAt: "2026-10-14" });

async function del(id: string) {
  const request = new Request(`${SITE}/api/admin/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
  const response = await handlers.DELETE({ request, url: new URL(request.url), params: { id } } as unknown as APIContext);
  return { status: response.status, body: response.status === 204 ? null : ((await response.json()) as { error: { code: string } }) };
}

async function publicStatus(slug: string) {
  const request = new Request(`${SITE}/api/posts/${slug}`);
  return (await readPublic({ request, url: new URL(request.url), params: { slug } } as unknown as APIContext)).status;
}

const count = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM posts").first<{ n: number }>())!.n;

describe("DELETE /api/admin/posts/:id", () => {
  // [TC-US09-04][SC-DELETE-05] 首次 204；再次 404；非法 id 404；其他文章不受影响
  it("204；重复删除与非法 id 均 404，不删除其他数据", async () => {
    const x = (await service.create(draft("del-x"), NOW)).id;
    const y = await service.create(draft("del-y"), NOW);
    const before = await count();

    const results = [await del(x), await del(x), await del("nope"), await del(""), await del("1 OR 1=1"), await del("*")];
    const yAfter = await service.getForEdit(Number(y.id));

    expect({
      statuses: results.map((r) => r.status),
      codes: results.slice(1).map((r) => r.body?.error.code),
      removed: before - (await count()),
      yIntact: yAfter?.body === y.body && yAfter?.slug === "del-y",
    }).toEqual({ statuses: [204, 404, 404, 404, 404, 404], codes: new Array(5).fill("POST_NOT_FOUND"), removed: 1, yIntact: true });
  });

  // [TC-US09-03][SC-DELETE-04] 已发布（clean / dirty）删除后读者 404；slug 释放可再用
  it("删除已发布文章后读者不可读，slug 可重新使用", async () => {
    const clean = (await service.create(draft("old-post"), NOW)).id;
    await service.publish(Number(clean), NOW);
    const dirty = (await service.create(draft("old-dirty", "D1"), NOW)).id;
    await service.publish(Number(dirty), NOW);
    await service.saveDraft(Number(dirty), draft("old-dirty", "D2"), NOW);
    const before = [await publicStatus("old-post"), await publicStatus("old-dirty")];

    await del(clean);
    await del(dirty);
    const reused = await service.create(draft("old-post"), NOW);

    expect({ before, after: [await publicStatus("old-post"), await publicStatus("old-dirty")], reused: reused.slug }).toEqual({
      before: [200, 200],
      after: [404, 404],
      reused: "old-post",
    });
  });

  // [TC-US09-09] 删除文章不删除正文引用的 R2 图片
  it("R2 图片保留", async () => {
    const key = "img/2026/10/abcdefghij_1x1_808080.png";
    await env.MEDIA.put(key, new Uint8Array([1, 2, 3]));
    const id = (await service.create(draft("with-image", `![a](/${key})`), NOW)).id;
    expect({ status: (await del(id)).status, image: (await env.MEDIA.head(key)) !== null }).toEqual({ status: 204, image: true });
  });

  // [TC-US09-07][TC-US09-08] 经 middleware：未登录（含不存在的 id）401，跨站 403，均不到达处理器
  it("未登录 401（不存在的 id 也是 401）；跨站 Origin 403", async () => {
    const middleware = createAuthMiddleware({ getSession: async () => null, siteOrigin: SITE, now: () => NOW });
    let reached = 0;
    const run = async (id: string, origin: string) => {
      const request = new Request(`${SITE}/api/admin/posts/${id}`, { method: "DELETE", headers: { Origin: origin } });
      const context = { request, url: new URL(request.url), cookies: { get: () => undefined }, locals: {} } as unknown as APIContext;
      const response = (await middleware(context, async () => {
        reached++;
        return new Response(null, { status: 204 });
      })) as Response;
      return response.status;
    };
    expect({ statuses: [await run("1", SITE), await run("999999", SITE), await run("1", "https://evil.example.com")], reached }).toEqual({
      statuses: [401, 401, 403],
      reached: 0,
    });
  });
});
