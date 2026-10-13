import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import type { PublicationChange } from "../../../src/domains/post/hooks";
import { createPostService } from "../../../src/domains/post/service";
import { MemoryPostRepo } from "./memory-post-repo";

// [POST-UT-06] PostService.publish（post domain-model §2.4）
const CREATED = new Date("2026-10-13T00:00:00.000Z");
const FIRST = new Date("2026-10-14T03:00:00.000Z");
const SECOND = new Date("2026-10-15T03:00:00.000Z");
const THIRD = new Date("2026-10-16T03:00:00.000Z");
const INPUT: DraftInput = { title: "Hello", slug: "hello", tags: [], summary: "", body: "正文", publishedAt: null };

describe("PostService.publish", () => {
  it("[POST-UT-06] 草稿发布并补当天日期；无修改再发布幂等不触发钩子；发布更新改 slug 时钩子收到 prevSlug", async () => {
    const repo = new MemoryPostRepo();
    const changes: PublicationChange[] = [];
    const service = createPostService({ repo, hooks: { onPublicationChanged: async (change) => void changes.push(change) } });
    const id = Number((await service.create(INPUT, CREATED)).id);

    const first = await service.publish(id, FIRST);
    const snapshot = (await repo.get(id))!.published;
    const again = await service.publish(id, SECOND);
    await service.saveDraft(id, { ...INPUT, slug: "hello-v2", publishedAt: first.publishedAt }, SECOND);
    const updated = await service.publish(id, THIRD);

    expect({
      first: { status: first.status, hasUnpublishedChanges: first.hasUnpublishedChanges, publishedAt: first.publishedAt, lastPublishedAt: first.lastPublishedAt },
      snapshotDate: snapshot?.publishedAt,
      again: { lastPublishedAt: again.lastPublishedAt, same: JSON.stringify(again) === JSON.stringify(first) },
      updated: { slug: updated.slug, hasUnpublishedChanges: updated.hasUnpublishedChanges, lastPublishedAt: updated.lastPublishedAt },
      changes,
    }).toEqual({
      first: { status: "published", hasUnpublishedChanges: false, publishedAt: "2026-10-14", lastPublishedAt: FIRST.toISOString() },
      snapshotDate: "2026-10-14",
      again: { lastPublishedAt: FIRST.toISOString(), same: true },
      updated: { slug: "hello-v2", hasUnpublishedChanges: false, lastPublishedAt: THIRD.toISOString() },
      changes: [
        { kind: "published", slug: "hello" },
        { kind: "updated", slug: "hello-v2", prevSlug: "hello" },
      ],
    });
  });
});
