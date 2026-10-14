import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown/render";

// [SC-IMAGE-01] 上传占位渲染为占位块（不出 img）；有地址的同名 alt、普通图片不受影响
describe("renderMarkdown 上传占位", () => {
  it("![上传中…]() / ![处理中…]() → 占位块；其余图片照常", async () => {
    const { html } = await renderMarkdown("![上传中…]()\n\n![处理中…]()\n\n![上传中…](/img/a.png)\n\n![image](/img/b.png)");
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect({
      placeholders: [...doc.querySelectorAll("[data-upload-placeholder]")].map((el) => [el.getAttribute("data-upload-placeholder"), el.textContent]),
      images: [...doc.querySelectorAll("img")].map((img) => img.getAttribute("src")),
    }).toEqual({
      placeholders: [
        ["uploading", "图片上传中…"],
        ["processing", "图片处理中…"],
      ],
      images: ["/img/a.png", "/img/b.png"],
    });
  });
});
