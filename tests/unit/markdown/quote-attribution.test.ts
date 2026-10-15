import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown/render";

const quote = async (lines: string[]) => (await renderMarkdown(lines.map((l) => `> ${l}`).join("\n>\n"))).html;

// [TC-US07-09][SC-ARTICLE-06] MD-UT-07 rehypeQuoteAttribution：预览与读者页同一插件
describe("引用署名", () => {
  it("末段以「— 」或「—— 」开头且引用不止一段 → footer[data-attribution]", async () => {
    expect(await quote(["我们这一代人。", "— 鲁迅"])).toMatch(/<blockquote>\s*<p>我们这一代人。<\/p>\s*<footer data-attribution(="")?>— 鲁迅<\/footer>\s*<\/blockquote>/);
    expect(await quote(["一句话。", "—— 鲁迅"])).toMatch(/<footer data-attribution(="")?>—— 鲁迅<\/footer>/);
  });

  it("「-- 」、破折号后无空格、署名不在最后一段、只有一段时不处理", async () => {
    for (const lines of [["一句话。", "-- 鲁迅"], ["一句话。", "—鲁迅"], ["— 鲁迅", "一句话。"], ["— 鲁迅"]]) {
      expect(await quote(lines), lines.join("|")).not.toMatch(/data-attribution/);
    }
  });

  it("署名段里的脚本仍被清洗", async () => {
    const html = await quote(["一句话。", "— 鲁迅<script>alert(1)</script>"]);
    expect(html).toMatch(/data-attribution/);
    expect(html).not.toMatch(/<script/);
  });
});
