// 上传前的前端校验与错误文案（media-upload module-spec §3，admin-post-editor"弹层与提示"图片错误）
// 本 Sprint 只接受静态图 png / jpg / webp / gif；heic、mov、mp4 在 Sprint 3（US-11）放开
import { UploadError } from "./upload-client";

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MESSAGE_UNSUPPORTED = "仅支持 png、jpg、webp、gif";
export const MESSAGE_TOO_LARGE = "图片不能超过 5MB";
export const MESSAGE_FAILED = "上传失败，请重试";

const MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

// 有 MIME 时以 MIME 为准；没有 MIME（部分系统拖入）时看扩展名
function isSupported(file: File): boolean {
  if (file.type) return MIME_TYPES.has(file.type);
  const ext = /\.([^.]+)$/.exec(file.name)?.[1]?.toLowerCase();
  return ext !== undefined && EXTENSIONS.has(ext);
}

export function validateImageFile(file: File): string | null {
  if (!isSupported(file)) return MESSAGE_UNSUPPORTED;
  if (file.size > IMAGE_MAX_BYTES) return MESSAGE_TOO_LARGE;
  return null;
}

// 服务端拒绝（绕过前端校验时）沿用前端文案；其余错误（网络中断、超时、5xx、0 字节等）统一为"上传失败，请重试"
export function uploadErrorMessage(error: unknown): string {
  if (error instanceof UploadError) {
    if (error.code === "FILE_TOO_LARGE") return MESSAGE_TOO_LARGE;
    if (error.code === "UNSUPPORTED_TYPE") return MESSAGE_UNSUPPORTED;
  }
  return MESSAGE_FAILED;
}

// 一批多张时提示带文件名（"多张图片出错时带上文件名"）
export const withFileName = (message: string, name: string, batchSize: number) => (batchSize > 1 ? `${name}：${message}` : message);
