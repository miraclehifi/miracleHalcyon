// 读者页正文图片（reader module-spec §4.2）：从 renderMarkdown 输出的静态 figure / 组图读出图片数据，
// 按文档顺序编号（灯箱下标），并记录每个挂载点（单图、组图）及其起始下标
import type { ExternalSource } from "../../components/article/external-media";
import type { LiveSource } from "../../components/article/live-photo";
import { liveVideoSrc } from "../markdown/plugins/image-key";

export interface ArticleImageData {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  accent?: string; // "#rrggbb"
  wide: boolean;
  live?: LiveSource;
  external?: ExternalSource; // 外链照片（ADR-010）：src 为原图，首屏显示缩略图
}

export type ArticleIsland =
  | { kind: "image"; element: HTMLElement; start: number; image: ArticleImageData }
  | { kind: "gallery"; element: HTMLElement; start: number; variant: "grid" | "accordion"; images: ArticleImageData[] };

const num = (value: string | undefined) => (value ? Number(value) : undefined);

// data-mp="{offset}+{size}"（渲染插件只输出合法正整数）
function motionRange(value: string | undefined): { offset: number; size: number } | undefined {
  const match = value ? /^(\d+)\+(\d+)$/.exec(value) : null;
  return match ? { offset: Number(match[1]), size: Number(match[2]) } : undefined;
}

function readFigure(figure: HTMLElement): ArticleImageData {
  const img = figure.querySelector("img");
  const src = figure.dataset.src ?? img?.getAttribute("src") ?? "";
  const thumb = figure.dataset.thumb;
  const range = thumb ? motionRange(figure.dataset.mp) : undefined;
  const live: LiveSource | undefined = !figure.hasAttribute("data-live")
    ? undefined
    : thumb
      ? range && { videoSrc: src, range, codec: "hevc" }
      : { videoSrc: liveVideoSrc(src) };
  return {
    src,
    alt: img?.getAttribute("alt") ?? "",
    caption: figure.querySelector("figcaption")?.textContent || undefined,
    width: num(figure.dataset.w),
    height: num(figure.dataset.h),
    accent: figure.dataset.rgb ? `#${figure.dataset.rgb}` : undefined,
    wide: figure.hasAttribute("data-wide"),
    live,
    external: thumb ? { thumb, ...(range && { mainBytes: range.offset }) } : undefined,
  };
}

export function collectArticleImages(root: HTMLElement): { islands: ArticleIsland[]; images: ArticleImageData[] } {
  const images: ArticleImageData[] = [];
  const islands: ArticleIsland[] = [];
  const found = [...root.querySelectorAll<HTMLElement>("figure[data-article-image], div[data-gallery]")].filter(
    (element) => !element.parentElement?.closest("[data-gallery]"),
  );
  for (const element of found) {
    const start = images.length;
    if (element.tagName === "FIGURE") {
      const image = readFigure(element);
      images.push(image);
      islands.push({ kind: "image", element, start, image });
    } else {
      const members = [...element.querySelectorAll<HTMLElement>(":scope > figure[data-article-image]")].map(readFigure);
      images.push(...members);
      islands.push({ kind: "gallery", element, start, variant: element.dataset.gallery === "accordion" ? "accordion" : "grid", images: members });
    }
  }
  return { islands, images };
}
