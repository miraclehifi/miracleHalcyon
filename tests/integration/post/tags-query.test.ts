import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService, type PostService } from "../../../src/domains/post/service";

// 标签补全（post api-contract GET /api/admin/tags）：工作稿 + 快照合并、按文章计数、不区分大小写去重、
// 按次数降序再按名称升序、最多 10 个、q 包含匹配
const NOW = new Date("2026-10-13T00:00:00.000Z");
const input = (slug: string, tags: string[]): DraftInput => ({ title: "标题", slug, tags, summary: "", body: "正文", publishedAt: "2026-10-13" });

let service: PostService;

beforeAll(async () => {
  service = createPostService({ repo: new D1PostRepo(env.DB) });
  const first = Number((await service.create(input("p1", ["astro", "Cloudflare"]), NOW)).id);
  await service.publish(first, NOW); // 快照标签：astro、Cloudflare
  await service.saveDraft(first, input("p1", ["Astro", "TS"]), NOW); // 工作稿标签：Astro、TS
  await service.create(input("p2", ["Astro"]), NOW);
  await service.create(input("p3", ["Cloudflare", "读书"]), NOW);
  await service.create(input("p4", Array.from({ length: 10 }, (_, i) => `t${i + 1}`)), NOW);
});

describe("PostService.suggestTags", () => {
  it("合并工作稿与快照、按文章计数、大小写合并取多数写法、排序与上限、q 过滤", async () => {
    expect({
      all: await service.suggestTags(""),
      q: await service.suggestTags("S"),
      none: await service.suggestTags("不存在"),
    }).toEqual({
      all: [
        { name: "Astro", count: 2 },
        { name: "Cloudflare", count: 2 },
        ...["t1", "t10", "t2", "t3", "t4", "t5", "t6", "t7"].map((name) => ({ name, count: 1 })),
      ],
      q: [
        { name: "Astro", count: 2 },
        { name: "TS", count: 1 },
      ],
      none: [],
    });
  });
});
