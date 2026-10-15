import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseReaderData } from "../../../src/integrations/reader-data";
import { groupTags, tagSlug } from "../../../src/lib/reader/tags";
import type { ReaderPost } from "../../../src/lib/reader/types";

// [TC-US05-06][SC-TAG-03] READER-UT-03（tagSlug 部分；groupTags 在 add-tag-pages）
describe("tagSlug", () => {
  it("小写，非字母数字的连续字符换成 -，去掉首尾 -；中文保留；为空时用 tag", () => {
    expect(tagSlug("Astro")).toBe("astro");
    expect(tagSlug("  Astro ")).toBe("astro");
    expect(tagSlug("C# 与 .NET/Core")).toBe("c-与-net-core");
    expect(tagSlug("写作")).toBe("写作");
    expect(tagSlug("#")).toBe("tag");
  });
});


const p = (slug: string, publishedAt: string, tags: string[]): ReaderPost => ({ slug, title: slug, summary: "", tags, publishedAt, lastPublishedAt: `${publishedAt}T08:00:00.000Z`, body: "", cover: null });

// [TC-US05-06][TC-US04-10][SC-TAG-02][SC-BROWSE-10] READER-UT-03（groupTags）
describe("groupTags", () => {
  it("大小写合并；显示名取出现最多的写法，平手取最早发布文章中的写法；按篇数降序、名称升序", () => {
    const groups = groupTags([p("c", "2026-10-03", ["Astro"]), p("b", "2026-10-02", ["astro", "TS"]), p("a", "2026-10-01", ["Astro", "ts"])]);
    expect(groups.map((g) => [g.name, g.slug, g.count, g.posts.map((x) => x.slug)])).toEqual([
      ["Astro", "astro", 3, ["c", "b", "a"]],
      ["ts", "ts", 2, ["b", "a"]],
    ]);
  });

  it("不同标签得到同一地址时，篇数少的追加 6 位哈希", () => {
    const groups = groupTags([p("a", "2026-10-02", ["C#"]), p("b", "2026-10-01", ["C#", "C"])]);
    const bySlugBase = Object.fromEntries(groups.map((g) => [g.name, g.slug]));
    expect(bySlugBase["C#"]).toBe("c");
    expect(bySlugBase.C).toMatch(/^c-[0-9a-f]{6}$/);
  });

  it("夹具：Astro 25 篇、显示名 Astro；Cloudflare 2；C# 与 .NET/Core 1", () => {
    const { posts } = parseReaderData(JSON.parse(readFileSync("tests/fixtures/reader/reader-fixture.json", "utf8")), "fixture");
    const groups = groupTags(posts);
    expect(groups.slice(0, 3).map((g) => [g.name, g.count, g.slug])).toEqual([
      ["Astro", 25, "astro"],
      ["Cloudflare", 2, "cloudflare"],
      ["C# 与 .NET/Core", 1, "c-与-net-core"],
    ]);
  });
});

describe("tagSlugMap", () => {
  it("大小写不同的写法映射到同一地址；冲突组用带哈希的地址；未知标签回退 tagSlug", async () => {
    const { tagSlugMap } = await import("../../../src/lib/reader/tags");
    const groups = groupTags([p("a", "2026-10-02", ["C#"]), p("b", "2026-10-01", ["c#", "C"])]);
    const slugOf = tagSlugMap(groups);
    expect([slugOf("C#"), slugOf("c#"), slugOf("C")]).toEqual(["c", "c", groups.find((g) => g.name === "C")!.slug]);
    expect(slugOf("New Tag")).toBe("new-tag");
  });
});
