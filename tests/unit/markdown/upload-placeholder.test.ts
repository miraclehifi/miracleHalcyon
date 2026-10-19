import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown/render";

const SOURCE = "段落A\n\n![上传中…]()\n\n![处理中…]()\n\n![上传失败]()\n\n前文 ![上传中…]() 后文\n\n![上传中…](/img/a.png)\n\n![image](/img/b.png)\n\n段落B";
const parse = (html: string) => new DOMParser().parseFromString(html, "text/html");

describe("renderMarkdown 上传占位", () => {
  // [SC-IMAGE-01] 预览（uploadPlaceholders: true）：三种占位输出挂载点，按出现顺序编号；独占段落时替换整个段落；
  // 有地址的同名 alt、普通图片不受影响
  it("预览：处理中 / 上传中 / 上传失败 → 挂载点（序号 0–3），不出 img、不留空段落", async () => {
    const doc = parse((await renderMarkdown(SOURCE, { uploadPlaceholders: true })).html);
    expect({
      placeholders: [...doc.querySelectorAll("[data-upload-placeholder]")].map((el) => [el.tagName.toLowerCase(), el.getAttribute("data-upload-placeholder"), el.getAttribute("data-placeholder-index")]),
      emptyParagraphs: [...doc.querySelectorAll("p")].filter((p) => p.textContent!.trim() === "").length,
      inline: doc.querySelector("p [data-upload-placeholder]")?.parentElement?.textContent?.replace(/\s+/g, " ").trim(),
      images: [...doc.querySelectorAll("img")].map((img) => img.getAttribute("src")),
    }).toEqual({
      placeholders: [
        ["div", "uploading", "0"],
        ["div", "processing", "1"],
        ["div", "failed", "2"],
        ["span", "uploading", "3"],
      ],
      emptyParagraphs: 0,
      inline: expect.stringMatching(/^前文 .*后文$/),
      images: ["/img/a.png", "/img/b.png"],
    });
  });

  // [SC-IMAGE-20] 读者端（默认选项）：占位全部删除，只剩占位的段落一并删除，不留任何文字或 img
  it("读者端：删除占位与空段落，其余内容不变", async () => {
    const { html } = await renderMarkdown(SOURCE);
    const doc = parse(html);
    expect({
      paragraphs: [...doc.querySelectorAll("p")].map((p) => p.textContent!.replace(/\s+/g, " ").trim()),
      images: [...doc.querySelectorAll("img")].map((img) => img.getAttribute("src")),
      leaks: /data-upload-placeholder|上传中|处理中|上传失败/.test(html.replace(/alt="上传中…"/, "")),
    }).toEqual({
      paragraphs: ["段落A", "前文 后文", "段落B"],
      images: ["/img/a.png", "/img/b.png"],
      leaks: false,
    });
  });
});
