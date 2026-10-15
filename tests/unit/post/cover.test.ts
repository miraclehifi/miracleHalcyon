import { describe, expect, it } from "vitest";
import { normalizeContent, type DraftInput } from "../../../src/domains/post/content";
import { contentHash } from "../../../src/domains/post/content-hash";
import { ValidationError } from "../../../src/domains/post/errors";
import { sha256Hex } from "../../../src/lib/crypto";

const COVER = "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg";
const base: DraftInput = { title: "标题", slug: "hello", tags: ["Astro"], summary: "摘要", body: "正文", publishedAt: "2026-10-10", cover: null };

// [TC-US06-08][SC-COVER-08] POST-UT-12
describe("normalizeContent 封面", () => {
  it("null 与站内图片地址合法；缺省按 null", () => {
    expect(normalizeContent(base).cover).toBeNull();
    expect(normalizeContent({ ...base, cover: COVER }).cover).toBe(COVER);
    const withoutCover: Partial<DraftInput> = { ...base };
    delete withoutCover.cover;
    expect(normalizeContent(withoutCover as DraftInput).cover).toBeNull();
  });

  it("外链、路径穿越、key 格式不符、带查询串或片段、非字符串、javascript: 不合法", () => {
    for (const cover of ["https://evil.example.com/a.jpg", "/img/../etc/passwd", "/img/2026/10/abc.jpg", `${COVER}?x=1`, `${COVER}#wide`, 123, "javascript:alert(1)"]) {
      const error = (() => {
        try {
          normalizeContent({ ...base, cover } as unknown as DraftInput);
        } catch (e) {
          return e;
        }
      })();
      expect(error, String(cover)).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).fields, String(cover)).toContain("cover");
    }
  });
});

// [TC-US06-09][SC-COVER-06] POST-UT-13：封面为空时与迁移前（6 字段）的哈希相同
describe("contentHash 兼容", () => {
  it("cover 为 null 时哈希与旧算法一致；有封面时不同", async () => {
    const old = await sha256Hex(JSON.stringify([base.title, base.slug, base.tags, base.summary, base.body, base.publishedAt]));
    expect(await contentHash(normalizeContent(base))).toBe(old);
    expect(await contentHash(normalizeContent({ ...base, cover: COVER }))).not.toBe(old);
  });
});
