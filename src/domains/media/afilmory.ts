// Afilmory 照片信息（media domain-model §10，ADR-010）：从登记站点的照片页内嵌清单 window.__MANIFEST__（v10）
// 读出一张照片的原图地址、宽高、主色（thumbHash 平均色）、缩略图与动态照片内嵌视频的字节范围。只读外部，不建表、不写 R2
import { thumbHashToAverageRGBA } from "thumbhash";

export interface AfilmoryPhotoInfo {
  id: string;
  url: string;
  thumbnail: string;
  width: number;
  height: number;
  rgb: string;
  video?: { offset: number; size: number };
}

// 清单里一张照片的原始字段（只取用到的）
export interface AfilmoryPhoto {
  id?: unknown;
  originalUrl?: unknown;
  thumbnailUrl?: unknown;
  width?: unknown;
  height?: unknown;
  thumbHash?: unknown;
  video?: unknown;
}

export class AfilmoryValidationError extends Error {
  readonly code = "VALIDATION_FAILED";
}
export class AfilmoryNotFoundError extends Error {
  readonly code = "NOT_FOUND";
}
export class AfilmoryUpstreamError extends Error {
  readonly code = "UPSTREAM_UNAVAILABLE";
}

export const AFILMORY_ID = /^[A-Za-z0-9_-]{1,64}$/;
const MANIFEST_OPEN = /<script id="manifest">\s*window\.__MANIFEST__\s*=\s*/;
const MAX_DIMENSION = 20000;
const DEFAULT_RGB = "808080";
const DEFAULT_TIMEOUT_MS = 10_000;

export function parseAfilmoryManifest(html: string): AfilmoryPhoto[] {
  const open = MANIFEST_OPEN.exec(html);
  if (!open) throw new AfilmoryUpstreamError("照片页中没有清单");
  const start = open.index + open[0].length;
  const end = html.indexOf("</script>", start);
  if (end < 0) throw new AfilmoryUpstreamError("清单不完整");
  let manifest: unknown;
  try {
    manifest = JSON.parse(html.slice(start, end).trim().replace(/;$/, ""));
  } catch {
    throw new AfilmoryUpstreamError("清单无法解析");
  }
  const data = (manifest as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) throw new AfilmoryUpstreamError("清单缺少照片列表");
  return data.filter((item): item is AfilmoryPhoto => typeof item === "object" && item !== null);
}

const isDimension = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_DIMENSION;
const isPositiveInt = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;

// 非 ASCII 路径（中文目录）编码；已编码的不重复编码
function httpsUrl(value: unknown): string {
  if (typeof value !== "string") throw new AfilmoryUpstreamError("照片地址缺失");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AfilmoryUpstreamError("照片地址不合法");
  }
  if (url.protocol !== "https:") throw new AfilmoryUpstreamError("照片地址不是 https");
  return url.href;
}

export function averageRgb(thumbHash: unknown): string {
  if (typeof thumbHash !== "string" || !/^(?:[0-9a-f]{2})+$/i.test(thumbHash)) return DEFAULT_RGB;
  try {
    const bytes = Uint8Array.from(thumbHash.match(/../g)!, (pair) => parseInt(pair, 16));
    const { r, g, b } = thumbHashToAverageRGBA(bytes);
    const hex = [r, g, b].map((v) => {
      if (!Number.isFinite(v)) throw new Error("bad channel");
      return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
    });
    return hex.join("");
  } catch {
    return DEFAULT_RGB;
  }
}

function motionVideo(video: unknown): AfilmoryPhotoInfo["video"] {
  if (typeof video !== "object" || video === null) return undefined;
  const { type, offset, size } = video as { type?: unknown; offset?: unknown; size?: unknown };
  return type === "motion-photo" && isPositiveInt(offset) && isPositiveInt(size) ? { offset, size } : undefined;
}

export function toPhotoInfo(photo: AfilmoryPhoto): AfilmoryPhotoInfo {
  if (!isDimension(photo.width) || !isDimension(photo.height)) throw new AfilmoryUpstreamError("照片尺寸不合法");
  const video = motionVideo(photo.video);
  return {
    id: String(photo.id),
    url: httpsUrl(photo.originalUrl),
    thumbnail: httpsUrl(photo.thumbnailUrl),
    width: photo.width,
    height: photo.height,
    rgb: averageRgb(photo.thumbHash),
    ...(video && { video }),
  };
}

export interface FetchAfilmoryDeps {
  site: string; // 登记的站点 origin，如 https://miraclehalcyon.afilmory.art
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export async function fetchAfilmoryPhoto(id: string, { site, fetch: doFetch = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: FetchAfilmoryDeps): Promise<AfilmoryPhotoInfo> {
  if (!AFILMORY_ID.test(id)) throw new AfilmoryValidationError("照片编号格式不正确");
  let html: string;
  try {
    const response = await doFetch(`${site}/photos/${id}`, { redirect: "manual", signal: AbortSignal.timeout(timeoutMs) });
    if (response.status !== 200) {
      await response.body?.cancel();
      throw new AfilmoryUpstreamError(`Afilmory 返回 ${response.status}`);
    }
    html = await response.text();
  } catch (error) {
    if (error instanceof AfilmoryUpstreamError) throw error;
    throw new AfilmoryUpstreamError("Afilmory 请求失败", { cause: error });
  }
  const photo = parseAfilmoryManifest(html).find((item) => String(item.id) === id);
  if (!photo) throw new AfilmoryNotFoundError("Afilmory 中没有这张照片");
  return toPhotoInfo(photo);
}
