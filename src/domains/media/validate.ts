// 上传文件校验（media domain-model §4）：按文件头魔数判定类型并解析真实尺寸，不信任扩展名与 Content-Type
import { FileTooLargeError, MediaValidationError, VideoTooLargeError } from "./errors";

export type ImageMime = "image/png" | "image/jpeg" | "image/webp" | "image/gif";
export type ImageExt = "png" | "jpg" | "webp" | "gif";
export interface SniffedImage {
  mime: ImageMime;
  ext: ImageExt;
  width: number;
  height: number;
}

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5,242,880
export const VIDEO_MAX_BYTES = 10 * 1024 * 1024; // 10,485,760
export const VIDEO_MIME = "video/mp4";
export const SNIFF_BYTES = 64 * 1024; // 只读前 64KB
export const DIMENSION_MAX = 20000;
export const DEFAULT_RGB = "808080";
const RGB = /^[0-9a-f]{6}$/;
const DIMENSION = /^[1-9]\d{0,4}$/;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) => signature.every((byte, i) => bytes[offset + i] === byte);
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

export function sniffImage(head: Uint8Array): SniffedImage | null {
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const dims = (() => {
    try {
      if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return png(view);
      if (startsWith(head, [0xff, 0xd8, 0xff])) return jpeg(head, view);
      if (startsWith(head, ascii("RIFF")) && startsWith(head, ascii("WEBP"), 8)) return webp(head, view);
      if (startsWith(head, ascii("GIF87a")) || startsWith(head, ascii("GIF89a"))) return gif(view);
    } catch {
      return null; // 截断：DataView 越界
    }
    return null;
  })();
  if (!dims || !inRange(dims.width) || !inRange(dims.height)) return null;
  return { ...dims.type, width: dims.width, height: dims.height };
}

const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= DIMENSION_MAX;
const TYPES = {
  png: { mime: "image/png", ext: "png" },
  jpg: { mime: "image/jpeg", ext: "jpg" },
  webp: { mime: "image/webp", ext: "webp" },
  gif: { mime: "image/gif", ext: "gif" },
} as const;

// IHDR 宽高：偏移 16、20，大端 32 位
function png(view: DataView) {
  return { type: TYPES.png, width: view.getUint32(16), height: view.getUint32(20) };
}

// 顺序扫描段，取首个 SOF0–SOF15（排除 DHT C4、JPG C8、DAC CC）；遇到 SOS / EOI 仍未找到则失败
function jpeg(head: Uint8Array, view: DataView) {
  let i = 2;
  while (i + 3 < head.length) {
    if (head[i] !== 0xff) return null;
    const marker = head[i + 1];
    if (marker === 0xff) {
      i++; // 填充字节
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2; // 无长度的独立标记
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { type: TYPES.jpg, height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
    }
    i += 2 + view.getUint16(i + 2);
  }
  return null;
}

function webp(head: Uint8Array, view: DataView) {
  const chunk = String.fromCharCode(...head.slice(12, 16));
  if (chunk === "VP8 ") {
    if (!startsWith(head, [0x9d, 0x01, 0x2a], 23)) return null;
    return { type: TYPES.webp, width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if (head[20] !== 0x2f) return null;
    const bits = view.getUint32(21, true);
    return { type: TYPES.webp, width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    const u24 = (offset: number) => view.getUint16(offset, true) | (view.getUint8(offset + 2) << 16);
    return { type: TYPES.webp, width: u24(24) + 1, height: u24(27) + 1 };
  }
  return null;
}

// 逻辑屏幕宽高：偏移 6、8，小端 16 位
function gif(view: DataView) {
  return { type: TYPES.gif, width: view.getUint16(6, true), height: view.getUint16(8, true) };
}

// 视频（domain-model §4.2）：偏移 4–8 为 ftyp，major brand 属于 mp4 白名单；
// 未转封装的 MOV（qt）与 HEIF 图片等其余 brand 一律拒绝；不解析编码（HEVC 与 H.264 都接受，ADR-006）
const VIDEO_BRANDS = new Set(["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V "]);

export function sniffVideo(head: Uint8Array): boolean {
  if (head.length < 12 || !startsWith(head, ascii("ftyp"), 4)) return false;
  return VIDEO_BRANDS.has(String.fromCharCode(...head.subarray(8, 12)));
}

export interface UploadFields {
  rgb?: string;
  width?: string;
  height?: string;
}

// rgb 缺省为中性灰；width / height 只校验格式，不采用（以文件头为准）
export function validateUploadFields(fields: UploadFields): { rgb: string } {
  const invalid = [
    fields.rgb !== undefined && !RGB.test(fields.rgb) && "rgb",
    fields.width !== undefined && !isDimension(fields.width) && "width",
    fields.height !== undefined && !isDimension(fields.height) && "height",
  ].filter((field): field is string => Boolean(field));
  if (invalid.length > 0) throw new MediaValidationError(invalid);
  return { rgb: fields.rgb ?? DEFAULT_RGB };
}

const isDimension = (text: string) => DIMENSION.test(text) && Number(text) <= DIMENSION_MAX;

export function checkImageSize(size: number): void {
  if (size === 0) throw new MediaValidationError(["file"]);
  if (size > IMAGE_MAX_BYTES) throw new FileTooLargeError(size);
}

export function checkVideoSize(size: number): void {
  if (size === 0) throw new MediaValidationError(["video"]);
  if (size > VIDEO_MAX_BYTES) throw new VideoTooLargeError(size);
}
