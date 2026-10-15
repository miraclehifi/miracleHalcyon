import { describe, expect, it } from "vitest";
import { pagePaths, paginate, sortPublished } from "../../../src/lib/reader/sort";
import type { ReaderPost } from "../../../src/lib/reader/types";

const post = (slug: string, publishedAt: string, lastPublishedAt = `${publishedAt}T08:00:00.000Z`): ReaderPost => ({
  slug,
  title: slug,
  summary: "",
  tags: [],
  publishedAt,
  lastPublishedAt,
  body: "",
  cover: null,
});

// READER-UT-01（SC-BROWSE-01、SC-BROWSE-05、SC-BROWSE-07）
describe("sortPublished / paginate / pagePaths", () => {
  it("发布日期降序；同日按 lastPublishedAt 降序；再相同按 slug 升序", () => {
    const sorted = sortPublished([
      post("b", "2026-10-01", "2026-10-01T01:00:00.000Z"),
      post("c", "2026-10-02"),
      post("a", "2026-10-01", "2026-10-01T09:00:00.000Z"),
      post("d", "2026-10-01", "2026-10-01T09:00:00.000Z"),
    ]);
    expect(sorted.map((p) => p.slug)).toEqual(["c", "a", "d", "b"]);
  });

  it("41 篇第 3 页只有 1 篇；0 篇时总页数为 1", () => {
    const items = Array.from({ length: 41 }, (_, i) => i);
    expect(paginate(items, 3)).toEqual({ items: [40], page: 3, totalPages: 3, total: 41, from: 41, to: 41 });
    expect(paginate(items, 2)).toMatchObject({ from: 21, to: 40 });
    expect(paginate([], 1)).toEqual({ items: [], page: 1, totalPages: 1, total: 0, from: 0, to: 0 });
  });

  it("只生成第 2 页起的页码", () => {
    expect(pagePaths(41)).toEqual([2, 3]);
    expect(pagePaths(20)).toEqual([]);
    expect(pagePaths(0)).toEqual([]);
  });
});
