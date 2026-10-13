import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService, type PostService } from "../../../src/domains/post/service";

// [POST-UT-10] 后台列表（post domain-model §6）：25 篇混合状态
const BASE = Date.parse("2026-10-01T00:00:00.000Z");
const at = (minute: number) => new Date(BASE + minute * 60_000);
const input = (title: string, slug: string): DraftInput => ({ title, slug, tags: ["T"], summary: "", body: "正文", publishedAt: "2026-10-01" });

let service: PostService;
const ids: string[] = [];

beforeAll(async () => {
  service = createPostService({ repo: new D1PostRepo(env.DB) });
  // 第 i 篇在第 i 分钟保存：i 越大越新。i % 3 == 0 → 草稿；其余发布；i % 5 == 0 的已发布文章再改一次（有未发布修改）
  for (let i = 0; i < 25; i++) {
    const title = i === 7 ? "100% Astro" : i === 8 ? "snake_case 笔记" : i === 9 ? "1000 Astro" : `文章 ${i}`;
    const { id } = await service.create(input(title, `post-${i}`), at(i));
    ids.push(id);
    if (i % 3 !== 0) {
      await service.publish(Number(id), at(i));
      if (i % 5 === 0) await service.saveDraft(Number(id), { ...input(title, `post-${i}`), body: "改过" }, at(i));
    }
  }
});

describe("PostService.list", () => {
  it("[POST-UT-10] 计数口径、排序、q 转义 % 与 _、超出页码返回空", async () => {
    const all1 = await service.list({ status: "all", q: "", page: 1 });
    const all2 = await service.list({ status: "all", q: "", page: 2 });
    const drafts = await service.list({ status: "draft", q: "", page: 1 });
    const published = await service.list({ status: "published", q: "", page: 1 });
    const percent = await service.list({ status: "all", q: "100%", page: 1 });
    const underscore = await service.list({ status: "all", q: "e_c", page: 1 });
    const literalUnderscore = await service.list({ status: "all", q: "1_0", page: 1 }); // 不转义会命中 100% / 1000
    const beyond = await service.list({ status: "all", q: "", page: 3 });
    const modified = published.items.filter((item) => item.hasUnpublishedChanges).map((item) => item.title);

    expect({
      counts: all1.counts,
      totals: [all1.total, drafts.total, published.total],
      pageSizes: [all1.items.length, all2.items.length, all1.pageSize],
      newestFirst: all1.items.slice(0, 3).map((item) => item.id),
      draftStatuses: [...new Set(drafts.items.map((item) => item.status))],
      modified,
      percent: { titles: percent.items.map((item) => item.title), counts: percent.counts },
      underscore: underscore.items.map((item) => item.title),
      literalUnderscore: literalUnderscore.total,
      beyond: { items: beyond.items, total: beyond.total, page: beyond.page },
      itemShape: Object.keys(all1.items[0]).sort(),
    }).toEqual({
      counts: { all: 25, draft: 9, published: 16 },
      totals: [25, 9, 16],
      pageSizes: [20, 5, 20],
      newestFirst: [ids[24], ids[23], ids[22]],
      draftStatuses: ["draft"],
      modified: ["文章 20", "文章 10", "文章 5"],
      percent: { titles: ["100% Astro"], counts: { all: 1, draft: 0, published: 1 } },
      underscore: ["snake_case 笔记"],
      literalUnderscore: 0,
      beyond: { items: [], total: 25, page: 3 },
      itemShape: ["hasUnpublishedChanges", "id", "status", "tags", "title", "updatedAt"],
    });
  });
});
