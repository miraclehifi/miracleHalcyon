import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import type { PostContent } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";

// PostRepo（post domain-model §5，data-model posts 表）
const CREATED = new Date("2026-10-13T00:00:00.000Z");
const SAVED = new Date("2026-10-13T01:00:00.000Z");
const PUBLISHED_AT = new Date("2026-10-13T02:00:00.000Z");
const content = (slug: string, extra: Partial<PostContent> = {}): PostContent => ({
  title: `标题 ${slug}`,
  slug,
  tags: ["Astro", "Cloudflare"],
  summary: "摘要",
  body: "# 正文",
  publishedAt: "2026-10-13",
  cover: null, // F-002 迁移 0003
  ...extra,
});

async function pubColumns(id: number) {
  return env.DB.prepare("SELECT pub_title, pub_slug, pub_hash, last_published_at FROM posts WHERE id = ?").bind(id).first();
}

describe("D1PostRepo", () => {
  it("insert / get 往返；updateDraft 不动快照；setPublished 写入与清空快照；slugTaken 只看他人", async () => {
    const repo = new D1PostRepo(env.DB);
    const a = (await repo.insert({ draft: content("post-a"), draftHash: "ha", createdAt: CREATED }))!;
    const b = (await repo.insert({ draft: content("draft-b", { tags: [] }), draftHash: "hb", createdAt: CREATED }))!;

    const inserted = await repo.get(a);
    await repo.setPublished(a, content("live-a"), "pa", PUBLISHED_AT);
    const snapshotBefore = await pubColumns(a);
    const updated = await repo.updateDraft(a, content("post-a2"), "ha2", SAVED);
    const snapshotAfter = await pubColumns(a);
    const afterUpdate = await repo.get(a);

    const slugs = {
      othersDraft: await repo.slugTaken("draft-b", a),
      othersSnapshot: await repo.slugTaken("live-a", b),
      ownSnapshot: await repo.slugTaken("live-a", a),
      ownDraft: await repo.slugTaken("post-a2", a),
      free: await repo.slugTaken("nobody", a),
      empty: await repo.slugTaken("", a),
    };

    await repo.setPublished(a, null, null, null);
    const unpublished = await repo.get(a);

    expect({
      inserted,
      snapshotUnchanged: JSON.stringify(snapshotAfter) === JSON.stringify(snapshotBefore),
      updated,
      updateMissing: await repo.updateDraft(9999, content("x"), "hx", SAVED),
      afterUpdate: { draft: afterUpdate?.draft, published: afterUpdate?.published, draftHash: afterUpdate?.draftHash, pubHash: afterUpdate?.pubHash, updatedAt: afterUpdate?.updatedAt },
      slugs,
      unpublished: { published: unpublished?.published, pubHash: unpublished?.pubHash, lastPublishedAt: unpublished?.lastPublishedAt },
      missing: await repo.get(9999),
    }).toEqual({
      inserted: {
        id: a,
        draft: content("post-a"),
        draftHash: "ha",
        published: null,
        pubHash: null,
        lastPublishedAt: null,
        createdAt: CREATED,
        updatedAt: CREATED,
      },
      snapshotUnchanged: true,
      updated: true,
      updateMissing: false,
      afterUpdate: { draft: content("post-a2"), published: content("live-a"), draftHash: "ha2", pubHash: "pa", updatedAt: SAVED },
      slugs: { othersDraft: true, othersSnapshot: true, ownSnapshot: false, ownDraft: false, free: false, empty: false },
      unpublished: { published: null, pubHash: null, lastPublishedAt: null },
      missing: null,
    });
  });
});
