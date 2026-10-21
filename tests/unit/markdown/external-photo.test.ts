import { describe, expect, it } from "vitest";
import { parseExternalPhoto, thumbnailFor } from "../../../src/lib/markdown/plugins/external-photo";
import { renderMarkdown } from "../../../src/lib/markdown/render";

// 外链照片（ADR-010，US-13）：登记前缀 = site.afilmory.storage
const STORAGE = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/";
const THUMBS = `${STORAGE}.afilmory/thumbnails/`;
const LIVE = `${STORAGE}18369.jpg#ext=3072x4096x8a7b6c,mp=3337665+14749941,live`;

const parse = (html: string) => new DOMParser().parseFromString(html, "text/html").body;

// [UT-166][SC-AFIL-08][SC-AFIL-11]
describe("parseExternalPhoto", () => {
  it("登记前缀下解析 ext 与 mp", () => {
    expect(parseExternalPhoto(LIVE, STORAGE)).toEqual({ w: 3072, h: 4096, rgb: "8a7b6c", thumb: `${THUMBS}18369.jpg`, mp: { offset: 3337665, size: 14749941 } });
    expect(parseExternalPhoto(`${STORAGE}18382.jpg#wide,ext=3068x4096x4e5a70`, STORAGE)).toEqual({ w: 3068, h: 4096, rgb: "4e5a70", thumb: `${THUMBS}18382.jpg` });
  });

  it("ext 不合法 → null；mp 不合法 → 只忽略 mp", () => {
    for (const ext of ["ext=0x600x112233", "ext=800x600", "ext=800x600xZZZZZZ", "ext=20001x1x000000", "ext=800x600x11223"]) {
      expect(parseExternalPhoto(`${STORAGE}a.jpg#${ext}`, STORAGE)).toBeNull();
    }
    for (const mp of ["mp=0+10", "mp=10", "mp=a+b", "mp=10+0"]) {
      expect(parseExternalPhoto(`${STORAGE}a.jpg#ext=800x600x112233,${mp}`, STORAGE)).not.toHaveProperty("mp");
    }
  });

  it("不在前缀下、点段、未登记 → null", () => {
    const ext = "#ext=800x600x112233,mp=10+20";
    for (const url of [
      `https://example.com/a.jpg${ext}`,
      `https://raw.githubusercontent.com/miraclehifi/photo-assets/main.evil/a.jpg${ext}`,
      `${STORAGE}../other/a.jpg${ext}`,
      `${STORAGE}x/%2e%2e/a.jpg${ext}`,
      `${STORAGE}${ext}`,
      `/img/2026/10/a.jpg${ext}`,
    ]) {
      expect(parseExternalPhoto(url, STORAGE)).toBeNull();
    }
    expect(parseExternalPhoto(LIVE, undefined)).toBeNull();
  });
});

// [UT-167][SC-AFIL-07][SC-AFIL-08]
describe("thumbnailFor", () => {
  it("仓库根目录 .afilmory/thumbnails/{文件名去扩展名}.jpg", () => {
    expect([
      thumbnailFor(`${STORAGE}18369.jpg`, STORAGE),
      thumbnailFor(`${STORAGE}%E6%89%8B%E5%8A%9E/wf2026/23473.jpg`, STORAGE),
      thumbnailFor(`${STORAGE}手办/wf2026/23473.jpg`, STORAGE),
      thumbnailFor(`${STORAGE}a.png#x`, STORAGE),
      thumbnailFor("https://example.com/a.jpg", STORAGE),
    ]).toEqual([`${THUMBS}18369.jpg`, `${THUMBS}23473.jpg`, `${THUMBS}23473.jpg`, `${THUMBS}a.jpg`, null]);
  });
});

// [UT-168][SC-AFIL-08][SC-AFIL-11]
describe("renderMarkdown 外链照片", () => {
  it("单图：宽高、主色、data-thumb / data-mp，img 为缩略图；live 生效", async () => {
    const { html, images } = await renderMarkdown(`![](${LIVE} "图注")`);
    const figure = parse(html).querySelector("figure[data-article-image]")!;
    const img = figure.querySelector("img")!;
    expect({
      src: figure.getAttribute("data-src"),
      w: figure.getAttribute("data-w"),
      h: figure.getAttribute("data-h"),
      rgb: figure.getAttribute("data-rgb"),
      thumb: figure.getAttribute("data-thumb"),
      mp: figure.getAttribute("data-mp"),
      live: figure.hasAttribute("data-live"),
      img: [img.getAttribute("src"), img.getAttribute("width"), img.getAttribute("height")],
      caption: figure.querySelector("figcaption")?.textContent,
    }).toEqual({
      src: `${STORAGE}18369.jpg`,
      w: "3072",
      h: "4096",
      rgb: "8a7b6c",
      thumb: `${THUMBS}18369.jpg`,
      mp: "3337665+14749941",
      live: true,
      img: [`${THUMBS}18369.jpg`, "3072", "4096"],
      caption: "图注",
    });
    expect(images[0]).toMatchObject({ src: `${STORAGE}18369.jpg`, w: 3072, thumb: `${THUMBS}18369.jpg`, mp: { offset: 3337665, size: 14749941 }, marks: { live: true } });
  });

  it("无 mp 时 live 不生效；wide 照常；中文路径编码后同样识别", async () => {
    const { html } = await renderMarkdown(`![](${STORAGE}手办/wf2026/23473.jpg#ext=4338x3254x112233,live,wide)`);
    const figure = parse(html).querySelector("figure")!;
    expect([figure.hasAttribute("data-live"), figure.hasAttribute("data-wide"), figure.hasAttribute("data-mp"), figure.getAttribute("data-thumb")]).toEqual([
      false,
      true,
      false,
      `${THUMBS}23473.jpg`,
    ]);
  });

  it("与文字同段的行内外链照片用缩略图，不加载含视频的整个原图（verify 发现）", async () => {
    const { html } = await renderMarkdown(`看这张 ![a](${LIVE}) 和 ![b](https://example.com/x.jpg#ext=800x600x112233)`);
    const imgs = [...parse(html).querySelectorAll("p img")].map((img) => img.getAttribute("src"));
    expect(imgs).toEqual([`${THUMBS}18369.jpg`, "https://example.com/x.jpg#ext=800x600x112233"]);
  });

  it("组图中的外链照片同样输出；未登记前缀按普通外链", async () => {
    const { html } = await renderMarkdown(`![](${LIVE})\n![](https://example.com/a.jpg#ext=800x600x112233,mp=10+20,live,wide)`);
    const body = parse(html);
    const [own, other] = [...body.querySelectorAll("[data-gallery] figure")];
    expect(own.getAttribute("data-thumb")).toBe(`${THUMBS}18369.jpg`);
    expect(["data-w", "data-h", "data-rgb", "data-thumb", "data-mp", "data-live"].filter((a) => other.hasAttribute(a))).toEqual([]);
    expect([other.querySelector("img")!.getAttribute("src"), other.hasAttribute("data-wide")]).toEqual(["https://example.com/a.jpg", true]);
  });
});
