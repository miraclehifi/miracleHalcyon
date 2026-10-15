// 上传客户端（media-upload module-spec §2、§3）：POST /api/admin/images（multipart），错误按契约的 code / message 抛出
// 浏览器算出的主色与宽高随请求上报（dominant-color.ts）；算不出时不传，服务端按中性灰 808080 记录
import type { ImageMeta } from "./dominant-color";

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
  rgb: string;
  live: boolean;
  videoUrl: string | null;
}

export class UploadError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export const UPLOAD_TIMEOUT_MS = 60_000; // 无响应超过 60 秒按失败处理

export interface UploadExtras {
  meta?: ImageMeta | null; // 浏览器算出的主色与宽高
  video?: Blob; // 实况视频（与静态图同一请求，api-contract `video` 字段）
}

export async function uploadImage(file: File, { meta, video }: UploadExtras = {}, fetchImpl: typeof fetch = fetch): Promise<UploadedImage> {
  const body = new FormData();
  body.append("file", file);
  if (video) body.append("video", video, file.name.replace(/\.[^.]*$/, "") + ".mp4");
  if (meta) {
    body.append("rgb", meta.rgb);
    body.append("width", String(meta.width));
    body.append("height", String(meta.height));
  }
  const response = await fetchImpl("/api/admin/images", { method: "POST", body, signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS) });
  if (response.ok) return (await response.json()) as UploadedImage;
  const error = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  throw new UploadError(error?.error?.code ?? "UPLOAD_FAILED", error?.error?.message ?? "上传失败，请重试", response.status);
}

// alt = 文件名去扩展名；剪贴板无名图片为 image；[ ] 转义（UT-91）
export function altFromFileName(name: string): string {
  const base = name.replace(/\.[^.]*$/, "");
  return (base || "image").replace(/[[\]]/g, (char) => `\\${char}`);
}

export const imageMarkdown = (alt: string, url: string) => `![${alt}](${url})`;
