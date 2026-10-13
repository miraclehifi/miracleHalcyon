import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, it } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PublishedPostQuery } from "../../../src/domains/post/published-query";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";

// [POST-UT-11] PublishedPostQuery（post domain-model 不变量 4）：只读已发布快照
const NOW = new Date("2026-10-13T00:00:00.000Z");
const LATER = new Date("2026-10-14T00:00:00.000Z");
const input = (slug: string, publishedAt: string, extra: Partial<DraftInput> = {}): DraftInput => ({
  title: `标题 ${slug}`,
  slug,
  tags: ["Astro"],
  summary: "摘要",
  body: "已发布正文",
  publishedAt,
  ...extra,
});

const query = new D1PublishedPostQuery(env.DB);

beforeAll(async () => {
  const service = createPostService({ repo: new D1PostRepo(env.DB) });
  await service.create(input("draft-only", "2026-10-20"), NOW); // 草稿：读者不可见
  const older = Number((await service.create(input("older", "2026-10-01", { tags: ["读书"] }), NOW)).id);
  const modified = Number((await service.create(input("modified", "2026-10-10"), NOW)).id);
  await service.publish(older, NOW);
  await service.publish(modified, NOW);
  await service.saveDraft(modified, input("modified-v2", "2026-10-10", { title: "工作稿标题", body: "未发布的修改", tags: ["Secret"] }), LATER);
});

describe("PublishedPostQuery", () => {
  it("[POST-UT-11] 草稿查不到；有修改的已发布文章返回快照；列表按 publishedAt 降序；标签只统计快照", async () => {
    const list = await query.listPublished({ page: 1, pageSize: 20 });
    const byTag = await query.listPublished({ page: 1, pageSize: 20, tag: "astro" });

    expect({
      draft: await query.getPublishedBySlug("draft-only"),
      workingSlug: await query.getPublishedBySlug("modified-v2"),
      modified: await query.getPublishedBySlug("modified"),
      list: { slugs: list.items.map((item) => item.slug), total: list.total, hasBody: "body" in list.items[0] },
      byTag: byTag.items.map((item) => item.slug),
      tags: await query.listPublishedTags(),
    }).toEqual({
      draft: null,
      workingSlug: null,
      modified: {
        slug: "modified",
        title: "标题 modified",
        summary: "摘要",
        tags: ["Astro"],
        publishedAt: "2026-10-10",
        body: "已发布正文",
        lastPublishedAt: NOW.toISOString(),
      },
      list: { slugs: ["modified", "older"], total: 2, hasBody: false },
      byTag: ["modified"],
      tags: [
        { name: "Astro", count: 1 },
        { name: "读书", count: 1 },
      ],
    });
  });
});
