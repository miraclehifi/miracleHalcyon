import { describe, expect, it } from "vitest";
import { parseImageKey, parseMarks } from "../../../src/lib/markdown/plugins/image-key";
import { renderMarkdown } from "../../../src/lib/markdown/render";

const IMG = (n: number) => `/img/2026/10/aaaaaaaa${String.fromCharCode(96 + n)}a_${1600 + n}x${900 + n}_55667${n}.jpg`;
const lines = (count: number, first = "") => Array.from({ length: count }, (_, i) => `![p${i + 1}](${IMG(i + 1)}${i === 0 ? first : ""})`).join("\n");

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html").body;
const render = async (source: string, sourceMap = false) => parse((await renderMarkdown(source, { sourceMap })).html);
const galleries = (body: HTMLElement) =>
  [...body.querySelectorAll("[data-gallery]")].map((el) => [el.getAttribute("data-gallery"), el.querySelectorAll("figure").length]);

// [UT-126][SC-LAYOUT-01][SC-LAYOUT-10] 文件名解析
describe("parseImageKey", () => {
  it("站内自描述文件名 → 宽高与主色；外链、不合命名、宽或高为 0 → null", () => {
    expect([
      parseImageKey("/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg"),
      parseImageKey("/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg#live,wide"),
      parseImageKey("https://example.com/a.png"),
      parseImageKey("/img/2026/10/bad-name.jpg"),
      parseImageKey("/img/2026/10/aaaaaaaaaa_0x900_556677.jpg"),
      parseImageKey("/img/2026/10/aaaaaaaaaa_1600x0_556677.jpg"),
      parseImageKey("/img/2026/10/aaaaaaaaaa_20001x900_556677.jpg"),
      parseImageKey("/img/2026/10/aaaaaaaaaa_1600x900_556677.svg"),
    ]).toEqual([{ w: 1600, h: 900, rgb: "556677" }, { w: 1600, h: 900, rgb: "556677" }, null, null, null, null, null, null]);
  });
});

// [UT-127][SC-LAYOUT-01][SC-LAYOUT-10] 片段解析：只认小写 wide / live / accordion
describe("parseMarks", () => {
  it("按逗号拆分，区分大小写，忽略未知标记", () => {
    const none = { wide: false, live: false, accordion: false };
    expect(["#wide", "#live,wide", "#WIDE", "#foo", "#wide,foo", "", "#accordion"].map((f) => parseMarks(`/img/a.jpg${f}`))).toEqual([
      { ...none, wide: true },
      { ...none, live: true, wide: true },
      none,
      none,
      { ...none, wide: true },
      none,
      { ...none, accordion: true },
    ]);
  });
});

// [UT-128][SC-LAYOUT-01][SC-LAYOUT-06] 单图输出结构
describe("单图", () => {
  it("figure[data-article-image] 带宽高主色与标记，title 成为图注，src 去掉片段", async () => {
    const body = await render(`![山](${IMG(1)}#wide,live "图注")\n\n![b](https://example.com/b.png#wide)`);
    const [own, external] = [...body.querySelectorAll("figure[data-article-image]")];
    const src = IMG(1);
    expect({
      own: [own.getAttribute("data-src"), own.getAttribute("data-w"), own.getAttribute("data-h"), own.getAttribute("data-rgb"), own.hasAttribute("data-wide"), own.hasAttribute("data-live")],
      ownImg: [own.querySelector("img")?.getAttribute("src"), own.querySelector("img")?.getAttribute("alt"), own.querySelector("img")?.getAttribute("width"), own.querySelector("img")?.getAttribute("title")],
      caption: own.querySelector("figcaption")?.textContent,
      external: [external.getAttribute("data-src"), external.hasAttribute("data-w"), external.hasAttribute("data-wide"), external.querySelector("img")?.hasAttribute("width"), external.querySelector("figcaption")],
      inParagraph: body.querySelector("p figure"),
    }).toEqual({
      own: [src, "1601", "901", "556671", true, true],
      ownImg: [src, "山", "1601", null],
      caption: "图注",
      external: ["https://example.com/b.png", false, true, false, null],
      inParagraph: null,
    });
  });

  it("live 只对站内 /img/ 生效", async () => {
    const body = await render("![e](https://example.com/x.jpg#live)");
    expect(body.querySelector("figure")?.hasAttribute("data-live")).toBe(false);
  });
});

// [UT-129][SC-LAYOUT-02][SC-LAYOUT-05] 组图判定矩阵
describe("组图判定", () => {
  it("只含图片和空白的段落 ≥ 2 张成组；混有文字、空行分隔、1 张不成组", async () => {
    const cases = [
      lines(2), // 换行分隔
      `![a](${IMG(1)}) ![b](${IMG(2)})`, // 同一行空格分隔
      `见下图\n${lines(2)}`, // 混有文字
      `![a](${IMG(1)})\n\n![b](${IMG(2)})`, // 空行分隔
      lines(1),
    ];
    const results = await Promise.all(cases.map(async (c) => {
      const body = await render(c);
      return { galleries: galleries(body), figures: body.querySelectorAll("figure").length };
    }));
    expect(results).toEqual([
      { galleries: [["grid", 2]], figures: 2 },
      { galleries: [["grid", 2]], figures: 2 },
      { galleries: [], figures: 2 },
      { galleries: [], figures: 2 },
      { galleries: [], figures: 1 },
    ]);
  });

  it("文字中的行内图片保持行内，独占一行的图片拆出为单图", async () => {
    const body = await render(`前文 ![i](${IMG(1)}) 后文\n![own](${IMG(2)})\n结尾`);
    expect({
      inline: body.querySelector("p img")?.getAttribute("alt"),
      figures: [...body.querySelectorAll("figure img")].map((img) => img.getAttribute("alt")),
      paragraphs: [...body.querySelectorAll("p")].map((p) => p.textContent?.trim()),
    }).toEqual({ inline: "i", figures: ["own"], paragraphs: ["前文  后文", "结尾"] });
  });
});

// [UT-130][SC-LAYOUT-03][SC-LAYOUT-04] 手风琴区间
describe("手风琴", () => {
  it("首张带 #accordion：2 → grid、3 / 7 → accordion、8 → grid；非首张的 #accordion 忽略", async () => {
    const second = `![a](${IMG(1)})\n![b](${IMG(2)}#accordion)\n![c](${IMG(3)})`;
    const results = await Promise.all([lines(2, "#accordion"), lines(3, "#accordion"), lines(7, "#accordion"), lines(8, "#accordion"), second].map(async (c) => galleries(await render(c))));
    expect(results).toEqual([[["grid", 2]], [["accordion", 3]], [["accordion", 7]], [["grid", 8]], [["grid", 3]]]);
  });
});

// [UT-131][SC-LAYOUT-04] 网格超过 9 张按 9 张切组
describe("网格切组", () => {
  it("10 张 → 9 张网格 + 1 张单图；18 张 → 两个 9 张网格", async () => {
    const ten = await render(Array.from({ length: 10 }, (_, i) => `![p${i}](${IMG((i % 9) + 1)})`).join("\n"));
    const eighteen = await render(Array.from({ length: 18 }, (_, i) => `![p${i}](${IMG((i % 9) + 1)})`).join("\n"));
    expect({
      ten: galleries(ten),
      tenSingles: [...ten.querySelectorAll("figure")].filter((f) => !f.closest("[data-gallery]")).length,
      eighteen: galleries(eighteen),
    }).toEqual({ ten: [["grid", 9]], tenSingles: 1, eighteen: [["grid", 9], ["grid", 9]] });
  });
});

// [UT-132][TC-US12-08][SC-LAYOUT-10] 注入内容被过滤，插件只输出白名单 data-* 属性
describe("图片插件与 sanitize", () => {
  const ALLOWED_DATA = new Set(["data-article-image", "data-src", "data-w", "data-h", "data-rgb", "data-wide", "data-live", "data-gallery", "data-count", "data-source-start", "data-source-end", "data-line"]);

  it("onerror、javascript:、title 中的 HTML、作者手写的 data-* 都不进入输出", async () => {
    const source = [
      `![x](${IMG(1)}#wide" onerror="window.__xss=1)`,
      "",
      "![x](javascript:window.__xss=1)",
      "",
      `![x](${IMG(1)} "<img src=x onerror=window.__xss=1>")`,
      "",
      '<div data-gallery="grid" data-src="javascript:alert(1)"><img src="/x.png" onerror="alert(1)"></div>',
      "",
      `![l](${IMG(2)}#live)`,
    ].join("\n");
    const body = await render(source, true);
    const all = [...body.querySelectorAll("*")];
    const dataAttrs = all.flatMap((el) => [...el.attributes].map((a) => a.name)).filter((n) => n.startsWith("data-") && !n.startsWith("data-footnote"));
    expect({
      onHandlers: all.flatMap((el) => [...el.attributes].filter((a) => a.name.startsWith("on")).map((a) => a.name)),
      javascript: /javascript:/i.test(body.innerHTML.replace(/>[^<]*</g, "><")), // 只看属性，不看文本
      captionIsText: [...body.querySelectorAll("figcaption")].map((c) => [c.textContent, c.children.length]),
      unknownData: [...new Set(dataAttrs)].filter((n) => !ALLOWED_DATA.has(n)),
      authorGallery: body.querySelectorAll("[data-gallery]").length,
    }).toEqual({
      onHandlers: [],
      javascript: false,
      captionIsText: [["<img src=x onerror=window.__xss=1>", 0]],
      unknownData: [],
      authorGallery: 0,
    });
  });
});

// [UT-133][SC-LAYOUT-11] 源码位置：figure 与组图带源码字符偏移，ImageRef 与之对应
describe("源码位置与 ImageRef", () => {
  it("sourceMap 时输出 data-source-start / end；images 列出全部图片", async () => {
    const single = `![山](${IMG(1)}#wide "图注")`;
    const group = `![a](${IMG(2)}#accordion)\n![b](${IMG(3)})\n![c](${IMG(4)})`;
    const source = `开头\n\n${single}\n\n${group}\n`;
    const { html, images } = await renderMarkdown(source, { sourceMap: true });
    const body = parse(html);
    const range = (el: Element | null) => [Number(el?.getAttribute("data-source-start")), Number(el?.getAttribute("data-source-end"))];
    const singleStart = source.indexOf(single);
    const groupStart = source.indexOf(group);
    expect({
      single: range(body.querySelector("figure")),
      gallery: range(body.querySelector("[data-gallery]")),
      cells: [...body.querySelectorAll("[data-gallery] figure")].map((f) => source.slice(...range(f))),
      refs: images.map((r) => ({ id: r.id, alt: r.alt, title: r.title, w: r.w, marks: r.marks, text: source.slice(r.sourceStart, r.sourceEnd) })),
    }).toEqual({
      single: [singleStart, singleStart + single.length],
      gallery: [groupStart, groupStart + group.length],
      cells: group.split("\n"),
      refs: [
        { id: "img-0", alt: "山", title: "图注", w: 1601, marks: { wide: true, live: false, accordion: false }, text: single },
        { id: "img-1", alt: "a", title: undefined, w: 1602, marks: { wide: false, live: false, accordion: true }, text: group.split("\n")[0] },
        { id: "img-2", alt: "b", title: undefined, w: 1603, marks: { wide: false, live: false, accordion: false }, text: group.split("\n")[1] },
        { id: "img-3", alt: "c", title: undefined, w: 1604, marks: { wide: false, live: false, accordion: false }, text: group.split("\n")[2] },
      ],
    });
  });

  it("不传 sourceMap 时不输出源码位置属性", async () => {
    const body = await render(lines(2));
    expect(body.querySelectorAll("[data-source-start], [data-source-end]").length).toBe(0);
  });
});
