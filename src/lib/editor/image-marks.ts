// 预览图片菜单改写源码（admin-post-editor"图片菜单"，US-12 BH-07 / BH-11）：按渲染时记录的源码位置 + URL 双重定位，
// 只改那一张图片的 URL 片段；定位不上（源码已被删改）返回 null，不改写。结果是 Edit，经 applyEdit 进入原生撤销栈
import { parseMarks, stripFragment, type ImageMark } from "../markdown/plugins/image-key";
import type { Edit } from "./format-commands";

export interface ImageLocation {
  start: number; // 图片语法 ![alt](url "title") 在源码中的起止偏移（ImageRef.sourceStart / sourceEnd）
  end: number;
  src: string; // 渲染时的图片地址（不含片段）
}

// ](url 或 ](<url>，url 到空白或右括号为止
const DESTINATION = /\]\(\s*(<[^>\n]*>|[^\s)]+)/;

// 定位 range 内的图片地址；与渲染时记录的地址不一致时返回 null
// 只从 start 往后找：连续改写时 URL 变长，渲染时记录的 end 会过期
export function locateImageUrl(source: string, { start, src }: ImageLocation): { from: number; to: number; url: string } | null {
  const text = source.slice(start);
  if (!text.startsWith("![")) return null;
  const match = DESTINATION.exec(text);
  if (!match) return null;
  const angled = match[1].startsWith("<");
  const url = angled ? match[1].slice(1, -1) : match[1];
  if (stripFragment(url) !== src) return null;
  const from = start + match.index + match[0].length - match[1].length + (angled ? 1 : 0);
  return { from, to: from + url.length, url };
}

// 切换一个标记：保留其他片段（含未知的）原顺序，新标记加在末尾；没有剩余片段时连 # 一起去掉
export function toggleMarkInUrl(url: string, mark: ImageMark, on: boolean): string {
  const hash = url.indexOf("#");
  const base = hash < 0 ? url : url.slice(0, hash);
  const parts = hash < 0 ? [] : url.slice(hash + 1).split(",").filter(Boolean);
  const rest = parts.filter((part) => part !== mark);
  const next = on ? [...rest, mark] : rest;
  return next.length > 0 ? `${base}#${next.join(",")}` : base;
}

// on 不传时按源码里当前的状态取反（菜单连续点击时不依赖上一次渲染的结果）
export function toggleMark(source: string, location: ImageLocation, mark: ImageMark, on?: boolean): Edit | null {
  const found = locateImageUrl(source, location);
  if (!found) return null;
  const insert = toggleMarkInUrl(found.url, mark, on ?? !parseMarks(found.url)[mark]);
  return insert === found.url ? null : { from: found.from, to: found.to, insert };
}

export type GalleryMode = "grid" | "accordion" | "split";

// 地址之后：可选的 title（"…" / '…' / (…)，可含括号）和右括号；返回右括号之后的偏移，不合语法返回 -1
const TAIL = /^(?:>)?\s*(?:"[^"]*"|'[^']*'|\([^)]*\))?\s*\)/;
function syntaxEnd(source: string, urlEnd: number): number {
  const match = TAIL.exec(source.slice(urlEnd));
  return match ? urlEnd + match[0].length : -1;
}

// 组图形态（admin-post-editor"图片菜单"组图菜单）：accordion 首张加 #accordion、grid 去掉；split 把图片之间的空白换成空行，
// 拆成单图。组内每张都要按位置 + 地址核对通过，图片之间只能是空白，否则返回 null 不改写
export function setGalleryMode(source: string, members: readonly ImageLocation[], mode: GalleryMode): Edit | null {
  if (members.length < 2) return null;
  if (mode !== "split") return toggleMark(source, members[0], "accordion", mode === "accordion");
  const found = members.map((member) => locateImageUrl(source, member));
  if (found.some((item) => item === null)) return null;
  const ends = found.map((item) => syntaxEnd(source, item!.to));
  if (ends.some((end) => end < 0)) return null;
  const parts: string[] = [];
  for (let i = 0; i < members.length; i++) {
    if (i > 0) {
      if (source.slice(ends[i - 1], members[i].start).trim() !== "") return null;
      parts.push("\n\n");
    }
    parts.push(source.slice(members[i].start, ends[i]));
  }
  return { from: members[0].start, to: ends[ends.length - 1], insert: parts.join("") };
}
