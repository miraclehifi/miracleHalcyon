import { describe, expect, it } from "vitest";
import type { PostContent } from "../../../src/domains/post/content";
import { contentHash } from "../../../src/domains/post/content-hash";
import { deriveStatus, type Post } from "../../../src/domains/post/post";

// [POST-UT-04] 派生状态（post domain-model §2.1）
const DRAFT: PostContent = { title: "Hello", slug: "hello", tags: [], summary: "", body: "正文", publishedAt: "2026-10-13" };
const EDITED: PostContent = { ...DRAFT, body: "改过的正文" };
const NOW = new Date("2026-10-13T00:00:00.000Z");

async function post(draft: PostContent, published: PostContent | null): Promise<Post> {
  return {
    id: 1,
    draft,
    draftHash: await contentHash(draft),
    published,
    pubHash: published ? await contentHash(published) : null,
    lastPublishedAt: published ? NOW : null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

describe("deriveStatus", () => {
  it("[POST-UT-04] 无快照 → draft；快照 = 工作稿 → published 无修改；快照 ≠ 工作稿 → published 有修改", async () => {
    expect({
      noSnapshot: deriveStatus(await post(DRAFT, null)),
      clean: deriveStatus(await post(DRAFT, DRAFT)),
      modified: deriveStatus(await post(EDITED, DRAFT)),
    }).toEqual({
      noSnapshot: { status: "draft", hasUnpublishedChanges: false },
      clean: { status: "published", hasUnpublishedChanges: false },
      modified: { status: "published", hasUnpublishedChanges: true },
    });
  });
});
