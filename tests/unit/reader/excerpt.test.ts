import { describe, expect, it } from "vitest";
import { excerptOf } from "../../../src/lib/reader/excerpt";

const post = (summary: string, body: string) => ({ summary, body });

// [TC-US04-03][SC-BROWSE-03] READER-UT-02
describe("excerptOf", () => {
  it("有摘要用摘要", () => {
    expect(excerptOf(post("  手写摘要 ", "正文"))).toBe("手写摘要");
  });

  it("无摘要时取正文纯文本，不露出 Markdown / HTML", () => {
    const text = excerptOf(post("", "## 标题\n\n**粗体**文字 ![图](/img/x.jpg) <b>粗</b>\n\n<script>alert(1)</script>"));
    expect(text).toBe("标题 粗体文字 粗");
    expect(text).not.toMatch(/[#*!<>[\]()]/);
  });

  it("超过 120 字截断加省略号；只有图片 / 代码块时为空", () => {
    const long = excerptOf(post("", "字".repeat(130)));
    expect(long).toBe(`${"字".repeat(120)}…`);
    expect(excerptOf(post("", "字".repeat(120)))).toBe("字".repeat(120));
    expect(excerptOf(post("", "![图](/img/x.jpg)\n\n```ts\nconst a = 1;\n```"))).toBe("");
  });
});
