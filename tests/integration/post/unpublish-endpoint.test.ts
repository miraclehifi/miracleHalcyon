import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createUnpublishHandler } from "../../../src/pages/api/admin/posts/[id]/unpublish";

// POST /api/admin/posts/:id/unpublish（post api-contract §3）
const NOW = new Date("2026-10-13T00:00:00.000Z");
const handler = createUnpublishHandler({ db: env.DB });
const draft = (slug: string): DraftInput => ({ title: "Hello", slug, tags: [], summary: "", body: "正文", publishedAt: "2026-10-13" });

async function unpublish(id: string) {
  const request = new Request(`http://localhost:4321/api/admin/posts/${id}/unpublish`, { method: "POST" });
  const response = await handler({ request, url: new URL(request.url), params: { id } } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("POST /api/admin/posts/:id/unpublish", () => {
  it("200 status = draft；草稿 409 NOT_PUBLISHED；404", async () => {
    const service = createPostService({ repo: new D1PostRepo(env.DB) });
    const live = (await service.create(draft("live"), NOW)).id;
    await service.publish(Number(live), NOW);
    const draftOnly = (await service.create(draft("draft-only"), NOW)).id;

    const ok = await unpublish(live);
    const notPublished = await unpublish(draftOnly);

    expect({
      ok: { status: ok.status, state: ok.body.status, lastPublishedAt: ok.body.lastPublishedAt },
      notPublished: { status: notPublished.status, error: notPublished.body.error },
      notFound: (await unpublish("9999")).status,
    }).toEqual({
      ok: { status: 200, state: "draft", lastPublishedAt: null },
      notPublished: { status: 409, error: { code: "NOT_PUBLISHED", message: "文章还没有发布" } },
      notFound: 404,
    });
  });
});
