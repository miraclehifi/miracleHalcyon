// 存储页文案（admin-storage.md"交互"）：清理确认框说明与结果提示
import { formatBytes } from "../format/bytes";
import type { CleanupResult } from "./storage-client";

export function cleanupConfirmText({ images, videos, bytes }: { images: number; videos: number; bytes: number }): string {
  const parts = [images > 0 ? `${images} 张图片` : null, videos > 0 ? `${videos} 个实况视频` : null].filter(Boolean);
  return `将清理 ${parts.join("、")}，释放 ${formatBytes(bytes)}。清理后无法恢复。`;
}

export function cleanupResultText({ removedImages, removedVideos, freedBytes }: CleanupResult): string {
  return `已清理 ${removedImages + removedVideos} 项，释放 ${formatBytes(freedBytes)}`;
}
