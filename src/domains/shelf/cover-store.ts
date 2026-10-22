// 书影音封面存储（shelf domain-model §3、data-model"R2 对象"）：R2 绑定 MEDIA 的 covers/ 前缀，本领域独占，不写 images 表
export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable"; // key 不可变（ADR-012 §4）

export interface CoverObject {
  body: ReadableStream;
  contentType: string | undefined;
  size: number;
  httpEtag: string;
}

export interface CoverStore {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<CoverObject | null>;
  delete(key: string): Promise<void>; // 不存在不报错
}

export class R2CoverStore implements CoverStore {
  constructor(private readonly bucket: R2Bucket) {}

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.bucket.put(key, bytes, { httpMetadata: { contentType, cacheControl: IMMUTABLE_CACHE } });
  }

  async get(key: string): Promise<CoverObject | null> {
    const object = await this.bucket.get(key);
    if (!object) return null;
    return { body: object.body, contentType: object.httpMetadata?.contentType, size: object.size, httpEtag: object.httpEtag };
  }

  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
