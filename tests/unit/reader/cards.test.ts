import { describe, expect, it } from "vitest";
import { listHref, toCardModel } from "../../../src/lib/reader/cards";
import type { ReaderPost } from "../../../src/lib/reader/types";

const post: ReaderPost = {
  slug: "hello",
  title: "Hello",
  summary: "手写摘要",
  tags: ["Astro", "C# 与 .NET/Core"],
  publishedAt: "2026-10-10",
  lastPublishedAt: "2026-10-12T01:00:00.000Z",
  body: "正文",
  cover: null,
};

// [TC-US04-02][TC-US04-06][SC-BROWSE-02][SC-BROWSE-05] UT-210
describe("listHref / toCardModel", () => {
  it("第 1 页为基础地址，第 n 页为 /page/n", () => {
    expect(listHref("/posts", 1)).toBe("/posts");
    expect(listHref("/posts", 3)).toBe("/posts/page/3");
    expect(listHref("/tags/astro", 2)).toBe("/tags/astro/page/2");
  });

  it("卡片模型：标签带地址，保留原写法", () => {
    expect(toCardModel(post)).toEqual({
      slug: "hello",
      title: "Hello",
      excerpt: "手写摘要",
      publishedAt: "2026-10-10",
      tags: [
        { name: "Astro", slug: "astro" },
        { name: "C# 与 .NET/Core", slug: "c-与-net-core" },
      ],
      cover: null,
    });
  });
});
