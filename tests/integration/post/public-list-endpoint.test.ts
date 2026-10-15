import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createPublicPostListHandler } from "../../../src/pages/api/posts/index";

// [TC-US08-07][SC-PUBLISH-06] GET /api/posts（post api-contract §4）：只含已发布快照、不含 body、tag 过滤不区分大小写
const NOW = new Date("2026-10-13T00:00:00.000Z");
const handler = createPublicPostListHandler({ db: env.DB });
const draft = (slug: string, tags: string[], publishedAt: string): DraftInput => ({ title: slug, slug, tags, summary: "摘要", body: "正文", publishedAt });

async function list(search = "") {
  const request = new Request(`http://localhost:4321/api/posts${search}`);
  const response = await handler({ request, url: new URL(request.url), params: {} } as unknown as APIContext);
  return { status: response.status, cache: response.headers.get("Cache-Control"), body: (await response.json()) as Record<string, unknown> };
}

describe("GET /api/posts", () => {
  it("只列已发布文章（忽略 status 参数），不含 body；tag 不区分大小写；page 非法 400；Cache-Control: no-store", async () => {
    const service = createPostService({ repo: new D1PostRepo(env.DB) });
    const create = async (slug: string, tags: string[], publishedAt: string, publish: boolean) => {
      const id = Number((await service.create(draft(slug, tags, publishedAt), NOW)).id);
      if (publish) await service.publish(id, NOW);
    };
    await create("older", ["Astro"], "2026-10-01", true);
    await create("newer", ["css"], "2026-10-10", true);
    await create("draft-only", ["Astro"], "2026-10-12", false);

    const all = await list("?status=draft");
    const byTag = await list("?tag=astro");
    const badPage = await list("?page=0");

    expect({
      all: { status: all.status, cache: all.cache, body: all.body },
      byTag: (byTag.body.items as { slug: string }[]).map((item) => item.slug),
      badPage: [badPage.status, (badPage.body.error as { code: string }).code, badPage.cache],
    }).toEqual({
      all: {
        status: 200,
        cache: "no-store",
        body: {
          items: [
            { slug: "newer", title: "newer", summary: "摘要", tags: ["css"], publishedAt: "2026-10-10", lastPublishedAt: NOW.toISOString(), cover: null },
            { slug: "older", title: "older", summary: "摘要", tags: ["Astro"], publishedAt: "2026-10-01", lastPublishedAt: NOW.toISOString(), cover: null },
          ],
          page: 1,
          pageSize: 20,
          total: 2,
        },
      },
      byTag: ["older"],
      badPage: [400, "VALIDATION_FAILED", "no-store"],
    });
  });
});
