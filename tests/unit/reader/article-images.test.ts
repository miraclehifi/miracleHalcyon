import { describe, expect, it } from "vitest";
import { renderMarkdown } from "../../../src/lib/markdown/render";
import { collectArticleImages } from "../../../src/lib/reader/article-images";

async function rootOf(markdown: string): Promise<HTMLElement> {
  const root = document.createElement("div");
  root.innerHTML = (await renderMarkdown(markdown)).html;
  return root;
}

const md = [
  '![山](/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg "图注一")',
  "![海](/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg#wide)",
  "![a](/img/2026/10/cccccccccc_800x1200_445566.jpg)\n![b](/img/2026/10/dddddddddd_1000x1000_778899.jpg)\n![c](/img/2026/10/eeeeeeeeee_1400x1050_8a7b6c.jpg)",
  "![f](/img/2026/10/ffffffffff_900x1600_3d6a2c.jpg#accordion)\n![g](/img/2026/10/gggggggggg_1920x1080_a8382c.jpg)\n![h](/img/2026/10/hhhhhhhhhh_1080x1350_e8a15a.jpg)",
  "![实况](/img/2026/10/jjjjjjjjjj_960x1280_6b7f8e.jpg#live)",
].join("\n\n");

// [TC-US10-01][TC-US10-04][SC-LIGHTBOX-01][SC-LIGHTBOX-03] UT-228：按正文顺序建立图片索引与挂载点
describe("collectArticleImages", () => {
  it("单图、网格、手风琴、实况按文档顺序编号；组图记录起始下标", async () => {
    const { islands, images } = collectArticleImages(await rootOf(md));
    expect(images.map((i) => i.alt)).toEqual(["山", "海", "a", "b", "c", "f", "g", "h", "实况"]);
    expect(islands.map((i) => (i.kind === "image" ? ["image", i.start] : [i.variant, i.start, i.images.length]))).toEqual([
      ["image", 0],
      ["image", 1],
      ["grid", 2, 3],
      ["accordion", 5, 3],
      ["image", 8],
    ]);
  });

  it("从静态结构读出图注、宽高、主色、宽图与实况视频地址", async () => {
    const { images } = collectArticleImages(await rootOf(md));
    expect(images[0]).toMatchObject({ src: "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg", caption: "图注一", width: 1600, height: 900, accent: "#556677", wide: false });
    expect(images[1].wide).toBe(true);
    expect(images[8].live).toEqual({ videoSrc: "/img/2026/10/jjjjjjjjjj_960x1280_6b7f8e.live.mp4" });
  });
});

// [UT-171][SC-AFIL-08][SC-AFIL-09][SC-AFIL-10] 外链照片（ADR-010）：读出缩略图、主图字节数与视频范围
describe("collectArticleImages 外链照片", () => {
  const S = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/";
  it("有 mp：external 带 mainBytes，live 为原图 + 范围 + hevc；无 mp：只有 thumb、无 live", async () => {
    const { images } = collectArticleImages(await rootOf(`![a](${S}a.jpg#ext=960x1280x6b7f8e,mp=21119+81755,live)\n\n![b](${S}b.jpg#ext=800x600x112233,live)`));
    expect(images[0]).toMatchObject({
      src: `${S}a.jpg`,
      width: 960,
      accent: "#6b7f8e",
      external: { thumb: `${S}.afilmory/thumbnails/a.jpg`, mainBytes: 21119 },
      live: { videoSrc: `${S}a.jpg`, range: { offset: 21119, size: 81755 }, codec: "hevc" },
    });
    expect([images[1].external, images[1].live]).toEqual([{ thumb: `${S}.afilmory/thumbnails/b.jpg` }, undefined]);
  });
});
