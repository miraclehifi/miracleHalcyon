import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createPublicPostHandler } from "../../../src/pages/api/posts/[slug]";

// [TC-US08][SC-PUBLISH] GET /api/posts/:slug（post api-contract §4）：发布后读者可读取快照
const NOW = new Date("2026-10-13T00:00:00.000Z");
const handler = createPublicPostHandler({ db: env.DB });
const draft = (slug: string, body = "已发布正文"): DraftInput => ({ title: "Hello", slug, tags: ["Astro"], summary: "摘要", body, publishedAt: "2026-10-13" });

async function read(slug: string) {
  const request = new Request(`http://localhost:4321/api/posts/${slug}`);
  const response = await handler({ request, url: new URL(request.url), params: { slug } } as unknown as APIContext);
  return { status: response.status, cache: response.headers.get("Cache-Control"), body: (await response.json()) as Record<string, unknown> };
}

describe("GET /api/posts/:slug", () => {
  it("发布后 200 返回快照（不含未发布修改）；草稿、撤回后、大小写不符 404；Cache-Control: no-store", async () => {
    const service = createPostService({ repo: new D1PostRepo(env.DB) });
    const id = Number((await service.create(draft("hello"), NOW)).id);
    const beforePublish = await read("hello");
    await service.publish(id, NOW);
    await service.saveDraft(id, draft("hello", "未发布的修改"), NOW);
    const published = await read("hello");
    const wrongCase = await read("Hello");
    await service.unpublish(id);
    const afterUnpublish = await read("hello");

    expect({
      beforePublish: [beforePublish.status, (beforePublish.body.error as { code: string }).code, beforePublish.cache],
      published: { status: published.status, cache: published.cache, body: published.body },
      wrongCase: wrongCase.status,
      afterUnpublish: afterUnpublish.status,
    }).toEqual({
      beforePublish: [404, "POST_NOT_FOUND", "no-store"],
      published: {
        status: 200,
        cache: "no-store",
        body: { slug: "hello", title: "Hello", summary: "摘要", tags: ["Astro"], publishedAt: "2026-10-13", body: "已发布正文", lastPublishedAt: NOW.toISOString() },
      },
      wrongCase: 404,
      afterUnpublish: 404,
    });
  });
});
