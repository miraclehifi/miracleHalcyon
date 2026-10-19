// 存储页接口（media api-contract，F-006）：检测与清理。失败一律抛错，由页面显示"检测失败 / 清理未完成"
export interface OrphanSummary {
  orphanImageCount: number;
  orphanImageBytes: number;
  orphanVideoCount: number;
  orphanVideoBytes: number;
  totalOrphanBytes: number;
  protectedCount: number;
}

export interface OrphanReport {
  summary: OrphanSummary;
  checkedAt: string;
}

export interface CleanupResult {
  removedImages: number;
  removedVideos: number;
  freedBytes: number;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`storage api ${response.status}`);
  return (await response.json()) as T;
}

export async function fetchOrphans(): Promise<OrphanReport> {
  return readJson<OrphanReport>(await fetch("/api/admin/storage/orphans", { headers: { Accept: "application/json" } }));
}

export async function cleanupOrphans(): Promise<CleanupResult> {
  return readJson<CleanupResult>(await fetch("/api/admin/storage/cleanup", { method: "POST", headers: { Accept: "application/json" } }));
}
