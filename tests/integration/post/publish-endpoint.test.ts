import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createPublishHandler } from "../../../src/pages/api/admin/posts/[id]/publish";

// POST /api/admin/posts/:id/publish（post api-contract §3）：发布与发布更新共用
const NOW = new Date("2026-10-13T00:00:00.000Z");
const LATER = new Date("2026-10-14T00:00:00.000Z");
const handler = createPublishHandler({ db: env.DB, now: () => LATER });
const draft = (slug: string, extra: Partial<DraftInput> = {}): DraftInput => ({ title: "Hello", slug, tags: [], summary: "", body: "正文", publishedAt: "2026-10-13", ...extra });

async function publish(id: string) {
  const request = new Request(`http://localhost:4321/api/admin/posts/${id}/publish`, { method: "POST" });
  const response = await handler({ request, url: new URL(request.url), params: { id } } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

describe("POST /api/admin/posts/:id/publish", () => {
  it("200（发布、发布更新）；422 MISSING_FIELDS 带 fields；409 SLUG_TAKEN；404", async () => {
    const repo = new D1PostRepo(env.DB);
    const service = createPostService({ repo });
    const ok = (await service.create(draft("first"), NOW)).id;
    const incomplete = (await service.create(draft("", { title: "", body: "  " }), NOW)).id;
    const clash = (await service.create(draft("clash"), NOW)).id;

    const published = await publish(ok);
    await service.saveDraft(Number(ok), draft("first", { body: "改过" }), NOW);
    const updated = await publish(ok);
    const missing = await publish(incomplete);
    // 另一篇的快照占用了 clash（直接写库模拟历史数据；仓储的写入自带 slug 条件，绕不过去）
    expect(await repo.setPublished(Number(incomplete), draft("clash"), "x", NOW)).toBe(false);
    await env.DB.prepare("UPDATE posts SET pub_title = 'x', pub_body = 'x', pub_slug = 'clash', pub_hash = 'x' WHERE id = ?").bind(Number(incomplete)).run();
    const taken = await publish(clash);

    expect({
      published: { status: published.status, state: published.body.status, dirty: published.body.hasUnpublishedChanges, at: published.body.lastPublishedAt },
      updated: { status: updated.status, body: updated.body.body, dirty: updated.body.hasUnpublishedChanges },
      missing: { status: missing.status, error: missing.body.error },
      taken: { status: taken.status, code: (taken.body.error as { code: string }).code },
      notFound: (await publish("9999")).status,
    }).toEqual({
      published: { status: 200, state: "published", dirty: false, at: LATER.toISOString() },
      updated: { status: 200, body: "改过", dirty: false },
      missing: { status: 422, error: { code: "MISSING_FIELDS", message: "发布前请填写：标题、slug、正文", fields: ["title", "slug", "body"] } },
      taken: { status: 409, code: "SLUG_TAKEN" },
      notFound: 404,
    });
  });
});
