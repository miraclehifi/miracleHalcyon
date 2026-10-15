import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseReaderData } from "../../../src/integrations/reader-data";
import { adjacentPosts } from "../../../src/lib/reader/adjacent";
import { relatedPosts } from "../../../src/lib/reader/related";
import type { ReaderPost } from "../../../src/lib/reader/types";

const { posts } = parseReaderData(JSON.parse(readFileSync("tests/fixtures/reader/reader-fixture.json", "utf8")), "fixture");
const bySlug = (slug: string) => posts.find((p) => p.slug === slug)!;
const p = (slug: string, publishedAt: string, tags: string[] = []): ReaderPost => ({ slug, title: slug, summary: "", tags, publishedAt, lastPublishedAt: `${publishedAt}T08:00:00.000Z`, body: "", cover: null });

// [TC-US08-02][SC-SIDEBAR-02][SC-SIDEBAR-03] READER-UT-04
describe("relatedPosts", () => {
  it("夹具 hello：共享标签多的在前，其后按发布时间，最多 8 篇，不含本文", () => {
    const related = relatedPosts(bySlug("hello"), posts);
    expect(related.map((r) => r.post.slug)).toEqual(["filler-01", "prev-post", "case-lower", "filler-02", "filler-03", "filler-04", "filler-05", "filler-06"]);
    expect(related[0].sharedTags).toEqual(["Astro", "Cloudflare"]);
    expect(related[2].sharedTags).toEqual(["Astro"]);
  });

  it("没有标签或没有其他文章共享标签时为空", () => {
    expect(relatedPosts(bySlug("first-post"), posts)).toEqual([]);
    expect(relatedPosts(bySlug("latest-post"), posts)).toEqual([]);
  });
});

// [TC-US09-03][SC-PREVNEXT-01][SC-PREVNEXT-04] READER-UT-05
describe("adjacentPosts", () => {
  it("上一篇为更早发布、下一篇为更新发布（只按已发布排序）", () => {
    const { prev, next } = adjacentPosts("hello", posts);
    expect([prev?.slug, next?.slug]).toEqual(["prev-post", "latest-post"]);
    expect(adjacentPosts("first-post", posts)).toMatchObject({ prev: null, next: { slug: "filler-36" } });
    expect(adjacentPosts("latest-post", posts)).toMatchObject({ prev: { slug: "hello" }, next: null });
  });

  it("只有一篇时两侧都为空；不存在的 slug 两侧为空", () => {
    expect(adjacentPosts("a", [p("a", "2026-10-01")])).toEqual({ prev: null, next: null });
    expect(adjacentPosts("nope", posts)).toEqual({ prev: null, next: null });
  });
});
