// 图片插件（markdown module-spec §2 remarkImageGroups + rehypeImageFigures，§3 输出结构）：
// Markdown 语法的图片 → figure[data-article-image]；只含图片和空白的段落 ≥ 2 张 → div[data-gallery]（每 9 张一组，
// 剩 1 张为单图；首张 #accordion 且 3–7 张为手风琴）；混有文字的段落中，独占一行的图片拆出为单图，行内图片保持行内。
// 组图判定与 figure 输出都在 sanitize 之后进行：sanitize 会去掉 data-*，而插件只生成白名单属性，作者手写的同名属性
// 已被过滤，不会混入。原始 HTML 中的 <img> 不处理（源码偏移处不是 "!"）
import type { Element, ElementContent, Properties, Root, RootContent } from "hast";
import type { Position } from "unist";
import type { VFile } from "vfile";
import { parseImageKey, parseMarks, stripFragment, type ImageMarks } from "./image-key";

export interface ImageRef {
  id: string; // 渲染内序号 "img-0"
  src: string;
  alt: string;
  title?: string;
  w?: number;
  h?: number;
  rgb?: string;
  marks: ImageMarks;
  sourceStart: number; // 图片语法在源码中的字符偏移
  sourceEnd: number;
}

declare module "vfile" {
  interface DataMap {
    images: ImageRef[];
  }
}

type GalleryMode = "grid" | "accordion";

const GALLERY_SIZE = 9;
const ACCORDION_MIN = 3;
const ACCORDION_MAX = 7;
const SITE_IMAGE_PREFIX = "/img/";

interface Context {
  source: string;
  sourceMap: boolean;
  images: ImageRef[];
}

type MarkdownImage = Element & { properties: { src: string }; position: Position };

const isMarkdownImage = (node: RootContent | ElementContent, ctx: Context): node is MarkdownImage =>
  node.type === "element" &&
  node.tagName === "img" &&
  typeof node.properties.src === "string" &&
  node.position?.start.offset !== undefined &&
  ctx.source[node.position.start.offset] === "!";

const isBreak = (node: ElementContent | undefined) => node?.type === "element" && node.tagName === "br";
const isBlank = (node: ElementContent) => (node.type === "text" && node.value.trim() === "") || isBreak(node);
const offsets = (img: MarkdownImage) => [img.position.start.offset ?? 0, img.position.end.offset ?? 0] as const;
const span = (first: { position?: Position }, last: { position?: Position }): Position | undefined =>
  first.position && last.position ? { start: first.position.start, end: last.position.end } : undefined;

function sourceRange(ctx: Context, start: number, end: number): Properties {
  return ctx.sourceMap ? { dataSourceStart: start, dataSourceEnd: end } : {};
}

function figure(img: MarkdownImage, ctx: Context): Element {
  const rawSrc = img.properties.src;
  const src = stripFragment(rawSrc);
  const key = parseImageKey(src);
  const marks = parseMarks(rawSrc);
  const live = marks.live && src.startsWith(SITE_IMAGE_PREFIX);
  const alt = typeof img.properties.alt === "string" ? img.properties.alt : "";
  const title = typeof img.properties.title === "string" && img.properties.title !== "" ? img.properties.title : undefined;
  const [start, end] = offsets(img);

  ctx.images.push({ id: `img-${ctx.images.length}`, src, alt, title, ...key, marks: { ...marks, live }, sourceStart: start, sourceEnd: end });

  const properties: Properties = {
    dataArticleImage: true,
    dataSrc: src,
    ...(key && { dataW: key.w, dataH: key.h, dataRgb: key.rgb }),
    ...(marks.wide && { dataWide: true }),
    ...(live && { dataLive: true }),
    ...sourceRange(ctx, start, end),
  };
  const imgProps: Properties = { src, alt, ...(key && { width: key.w, height: key.h }), loading: "lazy", decoding: "async" };
  const children: ElementContent[] = [{ type: "element", tagName: "img", properties: imgProps, children: [] }];
  if (title) children.push({ type: "element", tagName: "figcaption", properties: {}, children: [{ type: "text", value: title }] });
  return { type: "element", tagName: "figure", properties, children, position: img.position };
}

function gallery(imgs: MarkdownImage[], ctx: Context): Element {
  const first = imgs[0];
  const last = imgs[imgs.length - 1];
  const accordion = parseMarks(first.properties.src).accordion && imgs.length >= ACCORDION_MIN && imgs.length <= ACCORDION_MAX;
  const mode: GalleryMode = accordion ? "accordion" : "grid";
  return {
    type: "element",
    tagName: "div",
    properties: { dataGallery: mode, dataCount: imgs.length, ...sourceRange(ctx, offsets(first)[0], offsets(last)[1]) },
    children: imgs.map((img) => figure(img, ctx)),
    position: span(first, last),
  };
}

function imageGroups(imgs: MarkdownImage[], ctx: Context): Element[] {
  const groups: Element[] = [];
  for (let i = 0; i < imgs.length; i += GALLERY_SIZE) {
    const chunk = imgs.slice(i, i + GALLERY_SIZE);
    groups.push(chunk.length === 1 ? figure(chunk[0], ctx) : gallery(chunk, ctx));
  }
  return groups;
}

// 图片前后紧邻换行（或段落边界）即为独占一行
function isOwnLine(children: ElementContent[], i: number): boolean {
  const prev = children[i - 1];
  const next = children[i + 1];
  const prevOk = !prev || isBreak(prev) || (prev.type === "text" && /\n[^\S\n]*$/.test(prev.value));
  const nextOk = !next || isBreak(next) || (next.type === "text" && /^[^\S\n]*\n/.test(next.value));
  return prevOk && nextOk;
}

// 混有文字的段落：独占一行的图片拆出，其余内容按原顺序留在段落里（首尾空白与换行去掉，空段落不输出）
function paragraphRun(run: ElementContent[], p: Element): Element | null {
  while (run.length > 0 && isBlank(run[0])) run.shift();
  while (run.length > 0 && isBlank(run[run.length - 1])) run.pop();
  if (run.length === 0) return null;
  const first = run[0];
  const last = run[run.length - 1];
  const trim = (node: ElementContent, fn: (s: string) => string): ElementContent => (node.type === "text" ? { ...node, value: fn(node.value) } : node);
  run[0] = trim(run[0], (s) => s.trimStart());
  run[run.length - 1] = trim(run[run.length - 1], (s) => s.trimEnd());
  return { ...p, children: run, position: span(first, last) ?? p.position };
}

function splitMixedParagraph(p: Element, ctx: Context): Element[] {
  const out: Element[] = [];
  let run: ElementContent[] = [];
  const flush = () => {
    const para = paragraphRun(run, p);
    if (para) out.push(para);
    run = [];
  };
  p.children.forEach((child, i) => {
    if (isMarkdownImage(child, ctx) && isOwnLine(p.children, i)) {
      flush();
      out.push(figure(child, ctx));
    } else {
      run.push(child);
    }
  });
  flush();
  return out;
}

function transformParagraph(p: Element, ctx: Context): Element[] {
  const imageOnly = p.children.every((child) => isMarkdownImage(child, ctx) || isBlank(child));
  if (!imageOnly) return splitMixedParagraph(p, ctx);
  const imgs = p.children.filter((child): child is MarkdownImage => isMarkdownImage(child, ctx));
  const groups = imageGroups(imgs, ctx);
  if (groups.length === 1) groups[0].position = p.position; // 整段一个结构：沿用段落位置（data-line）
  return groups;
}

function transformChildren(parent: Root | Element, ctx: Context) {
  const out: (RootContent | ElementContent)[] = [];
  for (const child of parent.children) {
    if (child.type === "element" && child.tagName === "p" && child.children.some((c) => isMarkdownImage(c, ctx))) {
      out.push(...transformParagraph(child, ctx));
      continue;
    }
    if (child.type === "element") transformChildren(child, ctx);
    out.push(child);
  }
  parent.children = out as typeof parent.children;
}

export function rehypeImageFigures() {
  return (tree: Root, file: VFile) => {
    const ctx: Context = { source: String(file.value), sourceMap: file.data.sourceMap === true, images: [] };
    transformChildren(tree, ctx);
    file.data.images = ctx.images;
  };
}
