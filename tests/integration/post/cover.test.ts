import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { contentHash } from "../../../src/domains/post/content-hash";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createPostHandlers } from "../../../src/pages/api/admin/posts/[id]";
import { createPublicPostListHandler } from "../../../src/pages/api/posts";
import { createPublicPostHandler } from "../../../src/pages/api/posts/[slug]";

// 文章封面（F-002 US-06，post api-contract / data-model 0003）
const NOW = new Date("2026-10-15T00:00:00.000Z");
const LATER = new Date("2026-10-15T01:00:00.000Z");
const A = "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg";
const B = "/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg";
const draft = (slug: string, cover: string | null): DraftInput => ({ title: `封面 ${slug}`, slug, tags: [], summary: "", body: "正文", publishedAt: "2026-10-15", cover });

const service = createPostService({ repo: new D1PostRepo(env.DB) });
const admin = createPostHandlers({ db: env.DB, now: () => LATER });

const call = async (handler: (context: APIContext) => Response | Promise<Response>, url: string, params: Record<string, string>, init?: RequestInit) => {
  const request = new Request(`http://localhost:4321${url}`, init);
  const response = await handler({ request, url: new URL(request.url), params } as unknown as APIContext);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
};
const publicDetail = (slug: string) => call(createPublicPostHandler({ db: env.DB }), `/api/posts/${slug}`, { slug });
const put = (id: string, body: unknown) =>
  call(admin.PUT as never, `/api/admin/posts/${id}`, { id }, { method: "PUT", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("文章封面", () => {
  // [TC-US06-06][SC-COVER-06]
  it("[TC-US06-06] 公开接口返回快照封面，后台接口返回工作稿封面；无封面为 null", async () => {
    const withCover = Number((await service.create(draft("with-cover", A), NOW)).id);
    const without = Number((await service.create(draft("without-cover", null), NOW)).id);
    await service.publish(withCover, NOW);
    await service.publish(without, NOW);
    await service.saveDraft(withCover, draft("with-cover", B), LATER);

    const list = await call(createPublicPostListHandler({ db: env.DB }), "/api/posts?page=1", {});
    const items = list.body.items as { slug: string; cover: string | null }[];
    const forEdit = await call(admin.GET as never, `/api/admin/posts/${withCover}`, { id: String(withCover) });

    expect({
      detail: (await publicDetail("with-cover")).body.cover,
      listed: items.find((item) => item.slug === "with-cover")?.cover,
      noCover: (await publicDetail("without-cover")).body.cover,
      admin: forEdit.body.cover,
    }).toEqual({ detail: A, listed: A, noCover: null, admin: B });
  });

  // [TC-US06-08][SC-COVER-08] POST-UT-12（接口层）
  it("[TC-US06-08] PUT 校验 cover：非法 400 且不修改，合法 200，缺字段 400", async () => {
    const id = (await service.create(draft("validate-cover", null), NOW)).id;
    const results = [];
    for (const cover of ["https://evil.example.com/a.jpg", "/img/../etc/passwd", "/img/2026/10/abc.jpg", 123, "javascript:alert(1)"]) {
      const result = await put(id, { ...draft("validate-cover", null), cover });
      results.push([result.status, (result.body.error as { code: string; fields: string[] }).fields]);
    }
    const ok = await put(id, draft("validate-cover", A));
    const missing: Partial<DraftInput> = draft("validate-cover", null);
    delete missing.cover;
    const absent = await put(id, missing);
    expect(results.every(([status, fields]) => status === 400 && (fields as string[]).includes("cover"))).toBe(true);
    expect([ok.status, ok.body.cover, absent.status, (absent.body.error as { message: string }).message]).toEqual([200, A, 400, "请求缺少字段：cover"]);
  });

  // [TC-US06-05][SC-COVER-05] POST-UT-14：改封面 → 有未发布修改；发布更新后公开接口变化
  it("[TC-US06-05] 改封面产生未发布修改，发布更新后公开接口返回新封面", async () => {
    const id = Number((await service.create(draft("cover-flow", A), NOW)).id);
    await service.publish(id, NOW);
    const saved = await service.saveDraft(id, draft("cover-flow", B), LATER);
    const before = (await publicDetail("cover-flow")).body.cover;
    await service.publish(id, LATER);
    expect([saved.hasUnpublishedChanges, before, (await publicDetail("cover-flow")).body.cover]).toEqual([true, A, B]);
  });

  // [TC-US06-09][SC-COVER-06] POST-UT-13（数据层）：迁移 0003 前的行（cover 为 NULL、哈希按 6 字段）不会变成"有未发布修改"
  it("[TC-US06-09] 迁移前的旧文章 cover 为 null 且状态不变", async () => {
    const content = { title: "旧文章", slug: "legacy-post", tags: [], summary: "", body: "正文", publishedAt: "2026-10-01" };
    const hash = await contentHash(content);
    const at = NOW.toISOString();
    await env.DB.prepare(
      `INSERT INTO posts (title, slug, tags, summary, body, published_at, draft_hash, pub_title, pub_slug, pub_tags, pub_summary, pub_body, pub_published_at, pub_hash, last_published_at, created_at, updated_at)
       VALUES (?1, ?2, '[]', '', ?3, ?4, ?5, ?1, ?2, '[]', '', ?3, ?4, ?5, ?6, ?6, ?6)`,
    )
      .bind(content.title, content.slug, content.body, content.publishedAt, hash, at)
      .run();
    const row = await env.DB.prepare("SELECT id FROM posts WHERE slug = 'legacy-post'").first<{ id: number }>();
    const view = await service.getForEdit(row!.id);
    expect([view?.cover, view?.hasUnpublishedChanges, (await publicDetail("legacy-post")).body.cover]).toEqual([null, false, null]);
  });
});
