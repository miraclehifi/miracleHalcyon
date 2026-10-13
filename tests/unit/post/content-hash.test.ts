import { describe, expect, it } from "vitest";
import type { PostContent } from "../../../src/domains/post/content";
import { contentHash } from "../../../src/domains/post/content-hash";

// [POST-UT-03] contentHash（post domain-model §2.2）：规范化 JSON（固定字段顺序）+ SHA-256
const CONTENT: PostContent = {
  title: "Hello Astro",
  slug: "hello-astro",
  tags: ["Astro", "TS"],
  summary: "摘要",
  body: "# Hello",
  publishedAt: "2026-10-13",
};

describe("contentHash", () => {
  it("[POST-UT-03] 相同内容（不同对象、不同键顺序）哈希相同；标签顺序或任一字段变化哈希不同", async () => {
    const base = await contentHash(CONTENT);
    const reordered = await contentHash({ publishedAt: "2026-10-13", body: "# Hello", summary: "摘要", tags: ["Astro", "TS"], slug: "hello-astro", title: "Hello Astro" });
    const variants = await Promise.all([
      contentHash({ ...CONTENT, tags: ["TS", "Astro"] }),
      contentHash({ ...CONTENT, title: "Hello Astro!" }),
      contentHash({ ...CONTENT, slug: "" }),
      contentHash({ ...CONTENT, summary: "" }),
      contentHash({ ...CONTENT, body: "# Hello " }),
      contentHash({ ...CONTENT, publishedAt: null }),
    ]);

    expect({
      format: /^[0-9a-f]{64}$/.test(base),
      sameContent: reordered === base,
      allDiffer: new Set([base, ...variants]).size === variants.length + 1,
    }).toEqual({ format: true, sameContent: true, allDiffer: true });
  });
});
