// media 仓储（media domain-model §6）：R2 存文件，D1 images 表只做记录（渲染不依赖它，ADR-005）
import type { ImageMime } from "./validate";

export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";

export interface MediaStore {
  exists(key: string): Promise<boolean>;
  put(key: string, body: Uint8Array | Blob, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export class R2MediaStore implements MediaStore {
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
}

export interface ImageRepo {
  insert(image: ImageRow): Promise<void>;
}

export class D1ImageRepo implements ImageRepo {
  constructor(private readonly db: D1Database) {}

  async insert(image: ImageRow): Promise<void> {
    await this.db
      .prepare("INSERT INTO images (key, mime, size, width, height, rgb, original_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(image.key, image.mime, image.size, image.width, image.height, image.rgb, image.originalName, image.createdAt.toISOString())
      .run();
  }
}
