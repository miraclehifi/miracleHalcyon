// 存储清理（media domain-model §9，F-006）：统计并清理没有文章在用的图片与实况视频。
// 引用判定由 post 提供的只读 ImageReferenceQuery 完成（ADR-009），本模块不直接读文章表
import type { ImageReference, ImageReferenceQuery } from "../post/image-reference-query";
import type { ImageCleanupRepo, ImageRecord, MediaCleanupStore } from "./repo";

export const PROTECTION_MS = 24 * 60 * 60 * 1000; // 24 小时内上传的不参与：刚上传的图片要等自动保存后才写进正文

export interface OrphanSummary {
  orphanImageCount: number;
  orphanImageBytes: number;
  orphanVideoCount: number;
  orphanVideoBytes: number;
  totalOrphanBytes: number;
  protectedCount: number;
}

export interface OrphanClassification {
  images: ImageRecord[]; // 未引用图片（清理时连同其视频）
  videos: ImageRecord[]; // 图片仍被引用、视频没有被带实况引用（清理时只移除视频）
  protectedCount: number;
}

const NOT_ORPHAN: ImageReference = { referenced: true, liveReferenced: true }; // 缺少判定结果时按"在用"处理，宁可少删

export function classifyOrphans(rows: ImageRecord[], refs: Map<string, ImageReference>, now: Date): OrphanClassification {
  const result: OrphanClassification = { images: [], videos: [], protectedCount: 0 };
  const protectedSince = now.getTime() - PROTECTION_MS;
  for (const row of rows) {
    const ref = refs.get(row.key) ?? NOT_ORPHAN;
    const bucket = !ref.referenced ? result.images : row.videoKey !== null && !ref.liveReferenced ? result.videos : null;
    if (!bucket) continue;
    if (Date.parse(row.createdAt) > protectedSince) result.protectedCount++;
    else bucket.push(row);
  }
  return result;
}

const sum = (rows: ImageRecord[], pick: (row: ImageRecord) => number | null) => rows.reduce((total, row) => total + (pick(row) ?? 0), 0);

export function summarize({ images, videos, protectedCount }: OrphanClassification): OrphanSummary {
  const orphanImageBytes = sum(images, (row) => row.size);
  const orphanVideoBytes = sum(videos, (row) => row.videoSize);
  return {
    orphanImageCount: images.length,
    orphanImageBytes,
    orphanVideoCount: videos.length,
    orphanVideoBytes,
    totalOrphanBytes: orphanImageBytes + sum(images, (row) => row.videoSize) + orphanVideoBytes,
    protectedCount,
  };
}

export interface CleanupResult {
  removedImages: number;
  removedVideos: number;
  freedBytes: number;
}

// 清理中途失败（R2 或 D1）：已删除的不恢复；先删 R2 后改 D1，D1 行仍在，重跑可继续
export class StorageCleanupError extends Error {
  readonly code = "CLEANUP_FAILED";
}

export interface StorageService {
  detectOrphans(now: Date): Promise<OrphanSummary>;
  cleanupOrphans(now: Date): Promise<CleanupResult>;
}

export interface StorageServiceDeps {
  imageRepo: ImageCleanupRepo;
  mediaStore: MediaCleanupStore;
  references: ImageReferenceQuery;
}

export function createStorageService({ imageRepo, mediaStore, references }: StorageServiceDeps): StorageService {
  async function classify(now: Date): Promise<OrphanClassification> {
    const rows = await imageRepo.listAll();
    return classifyOrphans(rows, await references.classify(rows), now);
  }

  return {
    async detectOrphans(now) {
      return summarize(await classify(now));
    },

    async cleanupOrphans(now) {
      try {
        const orphans = await classify(now); // 按清理时的文章内容重新判定，不接受前端传入的 key
        const { orphanImageCount, orphanVideoCount, totalOrphanBytes } = summarize(orphans);
        if (orphanImageCount + orphanVideoCount === 0) return { removedImages: 0, removedVideos: 0, freedBytes: 0 };
        await mediaStore.deleteMany([
          ...orphans.images.flatMap((row) => (row.videoKey ? [row.key, row.videoKey] : [row.key])),
          ...orphans.videos.flatMap((row) => (row.videoKey ? [row.videoKey] : [])),
        ]);
        await imageRepo.removeOrphans(
          orphans.images.map((row) => row.key),
          orphans.videos.map((row) => row.key),
        );
        return { removedImages: orphanImageCount, removedVideos: orphanVideoCount, freedBytes: totalOrphanBytes };
      } catch (cause) {
        throw new StorageCleanupError("storage cleanup failed", { cause });
      }
    },
  };
}
