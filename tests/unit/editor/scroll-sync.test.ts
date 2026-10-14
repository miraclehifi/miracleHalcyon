import { describe, expect, it } from "vitest";
import { interpolate, scrollPairs } from "../../../src/lib/editor/scroll-sync";
import { renderMarkdown } from "../../../src/lib/markdown/render";

const SOURCE = [
  "# 标题", // 1
  "",
  "段落一", // 3
  "第二行",
  "",
  "## 小节", // 6
  "",
  "```ts", // 8
  "const a = 1;",
  "```",
  "",
  "- A", // 12
  "- B",
  "",
  "| a | b |", // 15
  "|---|---|",
  "| 1 | 2 |",
  "",
  "<div>raw</div>", // 19
  "",
  "正文[^1]", // 21
  "",
  "[^1]: 脚注",
].join("\n");

// 顶层块按出现顺序的 data-line（脚注区由插件生成，没有源码行，不标）
const dataLines = (html: string) => [...html.matchAll(/<(\w+)[^>]*\sdata-line="(\d+)"/g)].map(([, tag, line]) => `${tag}:${line}`);

describe("rehypeSourceLines（markdown module-spec MD-UT-05）", () => {
  // [UT-53][MD-UT-05][SC-PREVIEW-08] sourceMap 时顶层块带源码起始行；代码块外层（Expressive Code）也带；默认不输出
  it("sourceMap 时顶层块带 data-line，默认输出不变", async () => {
    const mapped = await renderMarkdown(SOURCE, { sourceMap: true });
    const plain = await renderMarkdown(SOURCE);

    expect({
      lines: dataLines(mapped.html),
      plainHasLines: plain.html.includes("data-line"),
      sameWithoutLines: mapped.html.replace(/ data-line="\d+"/g, "") === plain.html,
    }).toEqual({
      lines: ["h1:1", "p:3", "h2:6", "div:8", "ul:12", "table:15", "div:19", "p:21"],
      plainHasLines: false,
      sameWithoutLines: true,
    });
  });

  // 作者在原始 HTML 里写的 data-line 被 sanitize 去掉，不干扰映射
  it("原始 HTML 里的 data-line 不保留", async () => {
    const { html } = await renderMarkdown('<p data-line="99">x</p>', { sourceMap: true });
    expect(dataLines(html)).toEqual(["p:1"]);
  });
});

describe("同步滚动插值（editor module-spec §3）", () => {
  // [UT-53][SC-PREVIEW-08] 两侧行位置配对（加上首尾），按行分段线性插值；反向同样适用
  it("按行插值，首尾对齐，非单调的点被丢弃", () => {
    // 源码第 1、6、12 行在编辑区的 top 为 0、100、300；对应块在预览中为 0、400、500；可滚动高度 编辑 350 / 预览 900
    const pairs = scrollPairs(
      [
        { line: 1, editor: 0, preview: 0 },
        { line: 6, editor: 100, preview: 400 },
        { line: 8, editor: 150, preview: 380 }, // 预览位置倒退（如浮动元素）：丢弃
        { line: 12, editor: 300, preview: 500 },
      ],
      { editor: 350, preview: 900 },
    );
    const toPreview = (top: number) => interpolate(pairs, top, "editor");
    const toEditor = (top: number) => interpolate(pairs, top, "preview");

    expect({
      pairs: pairs.map((pair) => [pair.editor, pair.preview]),
      preview: [0, 50, 100, 200, 300, 325, 350, 400].map(toPreview),
      editor: [0, 200, 400, 450, 900].map(toEditor),
    }).toEqual({
      pairs: [
        [0, 0],
        [100, 400],
        [300, 500],
        [350, 900],
      ],
      preview: [0, 200, 400, 450, 500, 700, 900, 900],
      editor: [0, 50, 100, 200, 350],
    });
  });

  it("没有锚点时按比例映射", () => {
    const pairs = scrollPairs([], { editor: 200, preview: 1000 });
    expect([0, 50, 200].map((top) => interpolate(pairs, top, "editor"))).toEqual([0, 250, 1000]);
  });
});
