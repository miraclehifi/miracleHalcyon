// media 仓储（media domain-model §6）：R2 存文件，D1 images 表只做记录（渲染不依赖它，ADR-005）
import type { ImageMime } from "./validate";

export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export interface MediaStore {
  exists(key: string): Promise<boolean>;
  put(key: string, body: Uint8Array | Blob, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}

// 存储清理用（F-006）；与上传用的 MediaStore 分开
export interface MediaCleanupStore {
  deleteMany(keys: string[]): Promise<void>; // 不存在的 key 不报错
}

export const R2_DELETE_BATCH = 1000; // R2 delete(string[]) 单次上限

export class R2MediaStore implements MediaStore, MediaCleanupStore {
  constructor(private readonly bucket: R2Bucket) {}

  async exists(key: string): Promise<boolean> {
    return (await this.bucket.head(key)) !== null;
  }

  async put(key: string, body: Uint8Array | Blob, contentType: string): Promise<void> {
    await this.bucket.put(key, body, { httpMetadata: { contentType, cacheControl: IMMUTABLE_CACHE } });
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }

  async deleteMany(keys: string[]): Promise<void> {
    for (let i = 0; i < keys.length; i += R2_DELETE_BATCH) await this.bucket.delete(keys.slice(i, i + R2_DELETE_BATCH));
  }
}

export interface ImageRow {
  key: string;
  mime: ImageMime;
  size: number;
  width: number;
  height: number;
  rgb: string;
  originalName: string;
  createdAt: Date;
  video?: { key: string; size: number };
}

// 存储清理（F-006，media domain-model §9）读取的最小字段
export interface ImageRecord {
  key: string;
  size: number;
  videoKey: string | null;
  videoSize: number | null;
  createdAt: string;
}

export interface ImageRepo {
  insert(image: ImageRow): Promise<void>;
}

// 存储清理用（F-006）；与上传用的 ImageRepo 分开，上传侧不依赖清理能力
export interface ImageCleanupRepo {
  listAll(): Promise<ImageRecord[]>;
  removeOrphans(imageKeys: string[], videoOnlyKeys: string[]): Promise<void>; // 删行 + 只移除视频，一个 batch 内完成
}

export class D1ImageRepo implements ImageRepo, ImageCleanupRepo {
  constructor(private readonly db: D1Database) {}

  async listAll(): Promise<ImageRecord[]> {
    const { results } = await this.db
      .prepare("SELECT key, size, video_key AS videoKey, video_size AS videoSize, created_at AS createdAt FROM images")
      .all<ImageRecord>();
    return results;
  }

  async removeOrphans(imageKeys: string[], videoOnlyKeys: string[]): Promise<void> {
    // key 列表作为一个 JSON 参数（json_each），不受 D1 每条语句 100 个绑定参数的限制
    await this.db.batch([
      this.db.prepare("DELETE FROM images WHERE key IN (SELECT value FROM json_each(?))").bind(JSON.stringify(imageKeys)),
      this.db.prepare("UPDATE images SET video_key = NULL, video_size = NULL WHERE key IN (SELECT value FROM json_each(?))").bind(JSON.stringify(videoOnlyKeys)),
    ]);
  }

  async insert(image: ImageRow): Promise<void> {
    await this.db
      .prepare("INSERT INTO images (key, mime, size, width, height, rgb, video_key, video_size, original_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(image.key, image.mime, image.size, image.width, image.height, image.rgb, image.video?.key ?? null, image.video?.size ?? null, image.originalName, image.createdAt.toISOString())
      .run();
  }
}
