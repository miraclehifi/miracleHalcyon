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
