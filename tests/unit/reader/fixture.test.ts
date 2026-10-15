import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseReaderData } from "../../../src/integrations/reader-data";

const load = (name: string) => parseReaderData(JSON.parse(readFileSync(`tests/fixtures/reader/${name}.json`, "utf8")), name);

// 夹具自检：与 specs/test/features/F-002-博客首页与阅读/acceptance/_fixtures.md 的基准值一致
describe("reader-fixture", () => {
  const { posts } = load("reader-fixture");
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const lower = (t: string) => t.toLowerCase();

  it("41 篇已发布，不含草稿与撤回；最新 / 最早分别为 latest-post / first-post", () => {
    expect(posts).toHaveLength(41);
    expect(bySlug.has("draft-post") || bySlug.has("withdrawn-post")).toBe(false);
    expect(posts[0].slug).toBe("latest-post");
    expect(posts.at(-1)?.slug).toBe("first-post");
  });

  it("Astro 标签 25 篇（Astro 24 次、astro 1 次），Cloudflare 2 篇", () => {
    const astro = posts.filter((p) => p.tags.some((t) => lower(t) === "astro"));
    expect(astro).toHaveLength(25);
    expect(astro.filter((p) => p.tags.includes("astro"))).toHaveLength(1);
    expect(posts.filter((p) => p.tags.includes("Cloudflare")).map((p) => p.slug).sort()).toEqual(["filler-01", "hello"]);
  });

  it("hello：手写摘要、有封面、发布后更新过、正文 12 张图片与 3 个 h2 / 2 个 h3", () => {
    const hello = bySlug.get("hello")!;
    expect(hello.summary).toBe("手写摘要");
    expect(hello.cover).toMatch(/^\/img\/2026\/10\/\w{10}_\d+x\d+_[0-9a-f]{6}\.jpg$/);
    expect(hello.lastPublishedAt.slice(0, 10)).toBe("2026-10-12");
    expect(hello.body.match(/!\[/g)).toHaveLength(12);
    expect(hello.body.match(/^## /gm)).toHaveLength(3);
    expect(hello.body.match(/^### /gm)).toHaveLength(2);
  });

  it("reader-fixture-empty 为 0 篇", () => {
    expect(load("reader-fixture-empty").posts).toEqual([]);
  });
});
