// 上传客户端（media-upload module-spec §2、§3）：POST /api/admin/images（multipart），错误按契约的 code / message 抛出
// 主色计算（dominantColor）在 Sprint 3 接入，此前不传 rgb，服务端按中性灰 808080 记录

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

export async function uploadImage(file: File, fetchImpl: typeof fetch = fetch): Promise<UploadedImage> {
  const body = new FormData();
  body.append("file", file);
  const response = await fetchImpl("/api/admin/images", { method: "POST", body });
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
