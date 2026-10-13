import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createPostHandlers } from "../../../src/pages/api/admin/posts/[id]";

// GET /api/admin/posts/:id（post api-contract §3）
const NOW = new Date("2026-10-13T00:00:00.000Z");
const handlers = createPostHandlers({ db: env.DB, now: () => NOW });

async function get(id: string) {
  const request = new Request(`http://localhost:4321/api/admin/posts/${id}`);
  const response = await handlers.GET({ request, url: new URL(request.url), params: { id } } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("GET /api/admin/posts/:id", () => {
  it("200 返回工作稿；不存在、非数字 id 都是 404 POST_NOT_FOUND", async () => {
    const service = createPostService({ repo: new D1PostRepo(env.DB) });
    const created = await service.create({ title: "Hello", slug: "hello", tags: [], summary: "", body: "已发布", publishedAt: "2026-10-13" }, NOW);
    await service.publish(Number(created.id), NOW);
    const saved = await service.saveDraft(Number(created.id), { title: "Hello", slug: "hello", tags: [], summary: "", body: "工作稿", publishedAt: "2026-10-13" }, NOW);

    const notFound = { code: "POST_NOT_FOUND", message: "文章不存在或已被删除" };
    expect({
      ok: await get(created.id),
      missing: await get("9999"),
      nonNumeric: await get("abc"),
      negative: await get("-1"),
    }).toEqual({
      ok: { status: 200, body: saved },
      missing: { status: 404, body: { error: notFound } },
      nonNumeric: { status: 404, body: { error: notFound } },
      negative: { status: 404, body: { error: notFound } },
    });
  });
});
