import { describe, expect, it } from "vitest";
import { tagSlug } from "../../../src/lib/reader/tags";

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
