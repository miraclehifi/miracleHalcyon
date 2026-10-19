import { env } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { D1ImageRepo, R2MediaStore } from "../../../src/domains/media/repo";
import { createStorageService, StorageCleanupError } from "../../../src/domains/media/storage";
import { D1ImageReferenceQuery } from "../../../src/domains/post/image-reference-query";
import { clearAll, imageKey, NOW, seedImages, videoKeyOf } from "./storage-fixtures";

// [MEDIA-UT-10] 清理失败可重入（TC-US02-05）与分批（TC-US02-07）
const references = new D1ImageReferenceQuery(env.DB);
const count = async () => (await env.DB.prepare("SELECT count(*) AS n FROM images").first<{ n: number }>())!.n;

afterEach(clearAll);

describe("cleanupOrphans 失败与重入", () => {
  it("[TC-US02-05][SC-CLEANUP-09] R2 删除抛错：StorageCleanupError，D1 不动；恢复后重跑清理完成", async () => {
    await seedImages([1, 2, 3].map((n) => ({ key: imageKey(n), videoSize: n === 1 ? 10 : undefined, r2: true })));
    const failingStore = new R2MediaStore(env.MEDIA);
    failingStore.deleteMany = async () => {
      throw new Error("R2 down");
    };
    const broken = createStorageService({ imageRepo: new D1ImageRepo(env.DB), mediaStore: failingStore, references });
    const ok = createStorageService({ imageRepo: new D1ImageRepo(env.DB), mediaStore: new R2MediaStore(env.MEDIA), references });

    await expect(broken.cleanupOrphans(NOW)).rejects.toBeInstanceOf(StorageCleanupError);
    const rowsAfterFailure = await count();
    const retry = await ok.cleanupOrphans(NOW);

    expect({ rowsAfterFailure, retry, rows: await count(), objects: (await env.MEDIA.list({ prefix: "img/" })).objects.length }).toEqual({
      rowsAfterFailure: 3,
      retry: { removedImages: 3, removedVideos: 0, freedBytes: 3010 },
      rows: 0,
      objects: 0,
    });
  });

  it("[TC-US02-05][SC-CLEANUP-09] D1 写入抛错：R2 已删、D1 行仍在；重跑时 R2 删除已不存在的 key 不报错", async () => {
    await seedImages([1, 2].map((n) => ({ key: imageKey(n), videoSize: 20, r2: true })));
    const failingRepo = new D1ImageRepo(env.DB);
    failingRepo.removeOrphans = async () => {
      throw new Error("D1 down");
    };
    const broken = createStorageService({ imageRepo: failingRepo, mediaStore: new R2MediaStore(env.MEDIA), references });
    const ok = createStorageService({ imageRepo: new D1ImageRepo(env.DB), mediaStore: new R2MediaStore(env.MEDIA), references });

    await expect(broken.cleanupOrphans(NOW)).rejects.toBeInstanceOf(StorageCleanupError);
    const state = { rows: await count(), video: (await env.MEDIA.head(videoKeyOf(imageKey(1)))) !== null };
    const retry = await ok.cleanupOrphans(NOW);

    expect({ state, retry, rows: await count() }).toEqual({ state: { rows: 2, video: false }, retry: { removedImages: 2, removedVideos: 0, freedBytes: 2040 }, rows: 0 });
  });
});

describe("cleanupOrphans 分批", () => {
  it.each([1000, 1001, 1200])("[TC-US02-07][SC-CLEANUP-12] %i 张（每 4 张有 1 段视频）：全部删除，单次 R2 delete ≤ 1000 个 key", async (n) => {
    await seedImages(Array.from({ length: n }, (_, i) => ({ key: imageKey(i), videoSize: i % 4 === 0 ? 10 : undefined })));
    const batches: number[] = [];
    const bucket = {
      delete: async (keys: string | string[]) => {
        batches.push(Array.isArray(keys) ? keys.length : 1);
        await env.MEDIA.delete(keys);
      },
    } as unknown as R2Bucket;
    const service = createStorageService({ imageRepo: new D1ImageRepo(env.DB), mediaStore: new R2MediaStore(bucket), references });
    const result = await service.cleanupOrphans(NOW);
    const objects = n + Math.ceil(n / 4);

    expect({ removed: result.removedImages, rows: await count(), total: batches.reduce((a, b) => a + b, 0), max: Math.max(...batches) <= 1000 }).toEqual({
      removed: n,
      rows: 0,
      total: objects,
      max: true,
    });
  }, 60_000);
});
