// 自描述 key（media domain-model §3，ADR-005）：img/{yyyy}/{mm}/{id}_{w}x{h}_{rgb}.{ext}，yyyy/mm 取 UTC
import type { ImageExt } from "./validate";

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567"; // base32 小写
const ID_LENGTH = 10;

export function generateImageId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ID_LENGTH));
  return Array.from(bytes, (byte) => ID_ALPHABET[byte & 31]).join("");
}

export interface ImageKeyParts {
  id: string;
  width: number;
  height: number;
  rgb: string;
  ext: ImageExt;
  now: Date;
}

export function buildImageKey({ id, width, height, rgb, ext, now }: ImageKeyParts): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `img/${yyyy}/${mm}/${id}_${width}x${height}_${rgb}.${ext}`;
}

export const keyToUrl = (key: string) => `/${key}`;

// 实况视频与图片同名：去掉扩展名 + .live.mp4
export const videoKeyFor = (imageKey: string) => imageKey.replace(/\.[a-z]+$/, ".live.mp4");
