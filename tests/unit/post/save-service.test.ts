import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { contentHash } from "../../../src/domains/post/content-hash";
import { NotFoundError } from "../../../src/domains/post/errors";
import { createPostService } from "../../../src/domains/post/service";
import { MemoryPostRepo } from "./memory-post-repo";

// [POST-UT-07] saveDraft 不变量（post domain-model 不变量 1）：自动保存永远不改已发布快照
const CREATED = new Date("2026-10-13T00:00:00.000Z");
const PUBLISHED_AT = new Date("2026-10-13T01:00:00.000Z");
const SAVED = new Date("2026-10-13T02:00:00.000Z");
const INPUT: DraftInput = { title: " Hello ", slug: "hello", tags: ["Astro"], summary: "", body: "正文", publishedAt: "2026-10-13" };

describe("PostService.create / saveDraft / getForEdit", () => {
  it("[POST-UT-07] 已发布文章保存新内容：快照与 lastPublishedAt 不变，hasUnpublishedChanges 为 true", async () => {
    const repo = new MemoryPostRepo();
    const service = createPostService({ repo });
    const created = await service.create(INPUT, CREATED);
    const id = Number(created.id);
    const original = (await repo.get(id))!;
    await repo.setPublished(id, original.draft, original.draftHash, PUBLISHED_AT); // 发布服务由后续任务实现

    const saved = await service.saveDraft(id, { ...INPUT, body: "改过的正文" }, SAVED);
    const stored = (await repo.get(id))!;
    let missing: unknown;
    await service.saveDraft(9999, INPUT, SAVED).catch((error: unknown) => (missing = error));

    expect({
      created: { title: created.title, status: created.status, hasUnpublishedChanges: created.hasUnpublishedChanges, createdAt: created.createdAt },
      saved: { body: saved.body, status: saved.status, hasUnpublishedChanges: saved.hasUnpublishedChanges, updatedAt: saved.updatedAt, lastPublishedAt: saved.lastPublishedAt },
      snapshotUnchanged: stored.published === original.draft && stored.pubHash === original.draftHash,
      draftHash: stored.draftHash === (await contentHash(stored.draft)),
      forEdit: await service.getForEdit(id),
      missing: missing instanceof NotFoundError,
      missingForEdit: await service.getForEdit(9999),
    }).toEqual({
      created: { title: "Hello", status: "draft", hasUnpublishedChanges: false, createdAt: CREATED.toISOString() },
      saved: { body: "改过的正文", status: "published", hasUnpublishedChanges: true, updatedAt: SAVED.toISOString(), lastPublishedAt: PUBLISHED_AT.toISOString() },
      snapshotUnchanged: true,
      draftHash: true,
      forEdit: saved,
      missing: true,
      missingForEdit: null,
    });
  });
});
