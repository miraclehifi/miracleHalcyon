// 上传客户端（media-upload module-spec §2、§3"上传"）：POST /api/admin/images（multipart），用 XHR 以便拿到上传字节进度
// （fetch 没有上传进度）。错误按契约的 code / message 抛出；网络中断、超时分别为 NETWORK / TIMEOUT
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

// 超时从发请求起算、含上传请求体的时间：60 秒等待响应 + 按最低 256 KiB/s（约 2 Mbps）计的传输时间（50 MiB ≈ 4 分 20 秒）
const RESPONSE_WAIT_MS = 60_000;
const MIN_UPLOAD_BYTES_PER_SECOND = 256 * 1024;
export const uploadTimeoutMs = (bytes: number) => RESPONSE_WAIT_MS + Math.ceil(bytes / MIN_UPLOAD_BYTES_PER_SECOND) * 1000;

export interface UploadExtras {
  meta?: ImageMeta | null; // 浏览器算出的主色与宽高
  video?: Blob; // 实况视频（与静态图同一请求，api-contract `video` 字段）
}

export interface UploadOptions {
  onProgress?: (loaded: number, total: number) => void; // 请求体已发送的字节
  signal?: AbortSignal;
  xhr?: () => XMLHttpRequest; // 测试注入
}

const failed = (status: number, body: string): UploadError => {
  let error: { code?: string; message?: string } | undefined;
  try {
    error = (JSON.parse(body) as { error?: { code?: string; message?: string } }).error;
  } catch {
    error = undefined;
  }
  return new UploadError(error?.code ?? "UPLOAD_FAILED", error?.message ?? "上传失败，请重试", status);
};

export function uploadImage(file: File, { meta, video }: UploadExtras = {}, { onProgress, signal, xhr = () => new XMLHttpRequest() }: UploadOptions = {}): Promise<UploadedImage> {
  const body = new FormData();
  body.append("file", file);
  if (video) body.append("video", video, file.name.replace(/\.[^.]*$/, "") + ".mp4");
  if (meta) {
    body.append("rgb", meta.rgb);
    body.append("width", String(meta.width));
    body.append("height", String(meta.height));
  }
  return new Promise((resolve, reject) => {
    const request = xhr();
    let settled = false;
    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      action();
    };
    const onAbort = () => {
      settle(() => reject(new DOMException("上传已取消", "AbortError")));
      request.abort();
    };
    if (signal?.aborted) return onAbort();
    signal?.addEventListener("abort", onAbort);
    request.open("POST", "/api/admin/images");
    request.timeout = uploadTimeoutMs(file.size + (video?.size ?? 0));
    request.upload.onprogress = (event) => {
      if (!settled && event.lengthComputable) onProgress?.(event.loaded, event.total);
    };
    request.onload = () =>
      settle(() => {
        if (request.status >= 200 && request.status < 300) {
          try {
            resolve(JSON.parse(request.responseText) as UploadedImage);
          } catch {
            reject(failed(request.status, ""));
          }
        } else reject(failed(request.status, request.responseText));
      });
    request.onerror = () => settle(() => reject(new UploadError("NETWORK", "网络中断", 0)));
    request.ontimeout = () => settle(() => reject(new UploadError("TIMEOUT", "上传超时，请重试", 0)));
    request.send(body);
  });
}

// alt = 文件名去扩展名；剪贴板无名图片为 image；[ ] 转义（UT-91）
export function altFromFileName(name: string): string {
  const base = name.replace(/\.[^.]*$/, "");
  return (base || "image").replace(/[[\]]/g, (char) => `\\${char}`);
}

export const imageMarkdown = (alt: string, url: string) => `![${alt}](${url})`;
