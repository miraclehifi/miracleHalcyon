import { describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { SlugTakenError } from "../../../src/domains/post/errors";
import { createPostService } from "../../../src/domains/post/service";
import { MemoryPostRepo } from "./memory-post-repo";

// [POST-UT-09] slug 全站唯一（post domain-model 不变量 3）：含工作稿与已发布快照，冲突时整份不保存
const NOW = new Date("2026-10-13T00:00:00.000Z");
const input = (slug: string, body = "正文"): DraftInput => ({ title: "标题", slug, tags: [], summary: "", body, publishedAt: null });

async function outcome(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "ok";
  } catch (error) {
    return error instanceof SlugTakenError ? "SLUG_TAKEN" : String(error);
  }
}

describe("slug 唯一", () => {
  it("[POST-UT-09] 与他人工作稿 / 快照冲突 → SLUG_TAKEN 且不保存；与自己快照相同、空 slug → 通过", async () => {
    const repo = new MemoryPostRepo();
    const service = createPostService({ repo });
    const other = Number((await service.create(input("taken-draft"), NOW)).id);
    const published = Number((await service.create(input("live-slug"), NOW)).id);
    const live = (await repo.get(published))!;
    await repo.setPublished(published, live.draft, live.draftHash, NOW);
    await service.saveDraft(published, input("renamed"), NOW); // 工作稿改名，快照仍占用 live-slug
    const mine = Number((await service.create(input(""), NOW)).id);

    const results = {
      othersDraft: await outcome(() => service.saveDraft(mine, input("taken-draft", "新正文"), NOW)),
      othersSnapshot: await outcome(() => service.saveDraft(mine, input("live-slug"), NOW)),
      createConflict: await outcome(() => service.create(input("taken-draft"), NOW)),
      ownSnapshot: await outcome(() => service.saveDraft(published, input("live-slug"), NOW)),
      emptySlug: await outcome(() => service.saveDraft(other, input(""), NOW)),
    };

    expect({
      results,
      notSaved: (await repo.get(mine))!.draft.body,
      postCount: repo.rows.size,
    }).toEqual({
      results: { othersDraft: "SLUG_TAKEN", othersSnapshot: "SLUG_TAKEN", createConflict: "SLUG_TAKEN", ownSnapshot: "ok", emptySlug: "ok" },
      notSaved: "正文",
      postCount: 3,
    });
  });
});
