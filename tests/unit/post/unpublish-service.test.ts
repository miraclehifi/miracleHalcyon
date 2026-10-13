import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { NotPublishedError } from "../../../src/domains/post/errors";
import type { PublicationChange } from "../../../src/domains/post/hooks";
import { createPostService } from "../../../src/domains/post/service";
import { MemoryPostRepo } from "./memory-post-repo";

// [POST-UT-08] PostService.unpublish（post domain-model §2.4，US-08 S11）
const NOW = new Date("2026-10-13T00:00:00.000Z");
const INPUT: DraftInput = { title: "Hello", slug: "hello", tags: [], summary: "", body: "正文", publishedAt: "2026-10-13" };

describe("PostService.unpublish", () => {
  it("[POST-UT-08] 有修改的已发布文章撤回：工作稿保留修改、快照清空并通知；草稿撤回 → NOT_PUBLISHED", async () => {
    const repo = new MemoryPostRepo();
    const changes: PublicationChange[] = [];
    const service = createPostService({ repo, hooks: { onPublicationChanged: async (change) => void changes.push(change) } });
    const id = Number((await service.create(INPUT, NOW)).id);
    await service.publish(id, NOW);
    await service.saveDraft(id, { ...INPUT, body: "改过的正文" }, NOW);
    changes.length = 0;

    const view = await service.unpublish(id);
    const stored = (await repo.get(id))!;
    const draftId = Number((await service.create({ ...INPUT, slug: "draft-only" }, NOW)).id);
    const draftError = await service.unpublish(draftId).catch((error: unknown) => error);

    expect({
      view: { status: view.status, hasUnpublishedChanges: view.hasUnpublishedChanges, body: view.body, lastPublishedAt: view.lastPublishedAt },
      stored: { published: stored.published, pubHash: stored.pubHash },
      changes,
      draftError: draftError instanceof NotPublishedError,
    }).toEqual({
      view: { status: "draft", hasUnpublishedChanges: false, body: "改过的正文", lastPublishedAt: null },
      stored: { published: null, pubHash: null },
      changes: [{ kind: "unpublished", slug: "hello" }],
      draftError: true,
    });
  });
});
