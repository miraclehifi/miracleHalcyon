// 照片信息请求（media api-contract GET /api/admin/afilmory/photos/{id}）：失败统一抛 UploadError，
// 文案取接口的 error.message（"Afilmory 暂时无法访问" / "Afilmory 中没有这张照片"），网络错误为"网络中断"；401 由调用方走会话过期
import { UploadError } from "../upload/upload-client";
import type { AfilmoryPhotoInfo } from "./markdown";

const MESSAGE_FAILED = "获取照片信息失败，请重试";

export async function fetchAfilmoryPhoto(id: string, doFetch: typeof fetch = fetch): Promise<AfilmoryPhotoInfo> {
  let response: Response;
  try {
    response = await doFetch(`/api/admin/afilmory/photos/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" } });
  } catch {
    throw new UploadError("NETWORK", "网络中断", 0);
  }
  if (response.ok) return (await response.json()) as AfilmoryPhotoInfo;
  let error: { code?: string; message?: string } | undefined;
  try {
    error = ((await response.json()) as { error?: typeof error }).error;
  } catch {
    error = undefined;
  }
  throw new UploadError(error?.code ?? "UPSTREAM_UNAVAILABLE", error?.message || MESSAGE_FAILED, response.status);
}
