// 外链照片（ADR-010，markdown module-spec §3"外链照片"）：登记的照片存储前缀下的图片，URL 片段带 ext=宽x高x主色、
// mp=偏移+长度（动态照片内嵌视频在原图中的字节范围）。缩略图按规则推导，不写进 Markdown。纯函数，编辑器也会用到
import { stripFragment } from "./image-key";

export interface ExternalPhoto {
  w: number;
  h: number;
  rgb: string;
  thumb: string;
  mp?: { offset: number; size: number };
}

const EXT = /^ext=(\d{1,5})x(\d{1,5})x([0-9a-f]{6})$/;
const MP = /^mp=(\d{1,15})\+(\d{1,15})$/;
const MAX_DIMENSION = 20000;
const THUMBNAIL_DIR = ".afilmory/thumbnails/";
// 路径中的 . / .. 段（含编码形式）：new URL 会把它们解析掉，借此绕过前缀判断，一律不认
const DOT_SEGMENT = /(?:^|\/)(?:\.|%2e){1,2}(?:\/|$)/i;

const fragmentParts = (url: string) => {
  const i = url.indexOf("#");
  return i < 0 ? [] : url.slice(i + 1).split(",");
};

// 登记前缀下的规范地址；不在前缀下、不是合法 URL、含点段时为 null
function underStorage(url: string, storage: string | undefined): string | null {
  if (!storage) return null;
  const base = stripFragment(url);
  if (DOT_SEGMENT.test(base.split("?")[0])) return null;
  try {
    const href = new URL(base).href;
    return href.startsWith(storage) && href.length > storage.length ? href : null;
  } catch {
    return null;
  }
}

export function thumbnailFor(url: string, storage: string): string | null {
  const href = underStorage(url, storage);
  if (!href) return null;
  const file = new URL(href).pathname.split("/").pop() ?? "";
  const name = file.replace(/\.[^.]*$/, "");
  return name ? `${storage}${THUMBNAIL_DIR}${name}.jpg` : null;
}

const validDimension = (n: number) => n >= 1 && n <= MAX_DIMENSION;

export function parseExternalPhoto(url: string, storage: string | undefined): ExternalPhoto | null {
  if (!storage || !underStorage(url, storage)) return null;
  const parts = fragmentParts(url);
  const ext = parts.map((part) => EXT.exec(part)).find(Boolean);
  if (!ext) return null;
  const w = Number(ext[1]);
  const h = Number(ext[2]);
  const thumb = thumbnailFor(url, storage);
  if (!validDimension(w) || !validDimension(h) || !thumb) return null;
  const mp = parts.map((part) => MP.exec(part)).find(Boolean);
  const offset = Number(mp?.[1]);
  const size = Number(mp?.[2]);
  const video = mp && Number.isSafeInteger(offset) && Number.isSafeInteger(size) && offset > 0 && size > 0 ? { offset, size } : undefined;
  return { w, h, rgb: ext[3], thumb, ...(video && { mp: video }) };
}
