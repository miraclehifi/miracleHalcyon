// 浏览器端图片压缩（media-upload module-spec §2、§3"压缩计划""编码"，media-upload-experience 模块 2）：
// 格式按魔数识别；长边 ≤ 2560 且 < 512,000 B 的图原样上传；JPEG / WebP 缩到长边 2560 后重编码为 WebP 0.82，
// 浏览器导不出 WebP（toBlob 实际返回别的类型）时改用 JPEG 0.85；PNG 只缩尺寸、保持 PNG；GIF 一律原样（保留动画）。
// 解码按 EXIF 方向转正，canvas 重新编码天然不带 EXIF / GPS。结果不比原图小、或任何一步失败，都退回原文件，不打断上传
export type ImageFormat = "jpeg" | "png" | "webp" | "gif";

export const MAX_LONG_EDGE = 2560;
export const SKIP_BELOW_BYTES = 512_000;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

export type CompressionPlan = { action: "keep" } | { action: "encode"; width: number; height: number; output: "lossy" | "png" };

export interface DecodedImage {
  width: number;
  height: number;
  close(): void;
}

export interface CompressEnv {
  decode(file: Blob): Promise<DecodedImage>;
  // 画到 width × height 的画布并导出；拿不到画布时返回 null
  encode(image: DecodedImage, width: number, height: number, type: string, quality?: number): Promise<Blob | null>;
}

const startsWith = (bytes: Uint8Array, offset: number, text: string) => [...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));

export function sniffFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && startsWith(bytes, 1, "PNG")) return "png";
  if (startsWith(bytes, 0, "RIFF") && startsWith(bytes, 8, "WEBP")) return "webp";
  if (startsWith(bytes, 0, "GIF8")) return "gif";
  return null;
}

export function fitLongEdge(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return scale === 1 ? { width, height } : { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function planCompression({ format, size, width, height }: { format: ImageFormat; size: number; width: number; height: number }): CompressionPlan {
  const oversized = Math.max(width, height) > MAX_LONG_EDGE;
  if (format === "gif" || (!oversized && size < SKIP_BELOW_BYTES)) return { action: "keep" };
  if (format === "png" && !oversized) return { action: "keep" };
  return { action: "encode", ...fitLongEdge(width, height, MAX_LONG_EDGE), output: format === "png" ? "png" : "lossy" };
}

const EXTENSIONS: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export function renameForType(name: string, type: string): string {
  const base = name.replace(/\.[^.]*$/, "");
  return `${base}.${EXTENSIONS[type] ?? "img"}`;
}

async function encodeLossy(env: CompressEnv, image: DecodedImage, width: number, height: number): Promise<Blob | null> {
  const webp = await env.encode(image, width, height, "image/webp", WEBP_QUALITY);
  if (!webp || webp.type === "image/webp") return webp;
  return env.encode(image, width, height, "image/jpeg", JPEG_QUALITY);
}

export async function compressImage(file: File, env: CompressEnv = browserEnv): Promise<File> {
  try {
    const format = sniffFormat(new Uint8Array(await file.slice(0, 12).arrayBuffer()));
    if (!format || format === "gif") return file;
    const image = await env.decode(file);
    try {
      const plan = planCompression({ format, size: file.size, width: image.width, height: image.height });
      if (plan.action === "keep") return file;
      const blob = plan.output === "png" ? await env.encode(image, plan.width, plan.height, "image/png") : await encodeLossy(env, image, plan.width, plan.height);
      if (!blob || blob.size >= file.size) return file;
      return new File([blob], renameForType(file.name, blob.type), { type: blob.type });
    } finally {
      image.close();
    }
  } catch {
    return file;
  }
}

type Canvas = OffscreenCanvas | HTMLCanvasElement;

function createCanvas(width: number, height: number): Canvas {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
  return Object.assign(document.createElement("canvas"), { width, height });
}

function canvasToBlob(canvas: Canvas, type: string, quality?: number): Promise<Blob | null> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export const browserEnv: CompressEnv = {
  async decode(file) {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  },
  async encode(image, width, height, type, quality) {
    const canvas = createCanvas(width, height);
    try {
      const context = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      if (!context) return null;
      if (type === "image/jpeg") {
        context.fillStyle = "#ffffff"; // JPEG 没有透明通道，透明处按白底
        context.fillRect(0, 0, width, height);
      }
      context.imageSmoothingQuality = "high";
      context.drawImage(image as ImageBitmap, 0, 0, width, height);
      return await canvasToBlob(canvas, type, quality);
    } finally {
      canvas.width = 0; // 释放大画布占用的内存
      canvas.height = 0;
    }
  },
};
