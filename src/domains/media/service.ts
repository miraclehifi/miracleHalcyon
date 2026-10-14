// media 领域服务（media domain-model §5）：校验 → 嗅探 → 生成 key → 写 R2 → 写 images；任一步失败不留残余
// 本 Sprint 只做单图；video（实况照片）在 Sprint 3 US-11 接入
import { UnsupportedTypeError, UploadFailedError } from "./errors";
import { buildImageKey, generateImageId, keyToUrl } from "./key";
import type { ImageRepo, MediaStore } from "./repo";
import { checkImageSize, sniffImage, SNIFF_BYTES, validateUploadFields, type UploadFields } from "./validate";

export interface UploadInput extends UploadFields {
  file: Blob & { name: string };
  now: Date;
}

export interface UploadResult {
  url: string;
  width: number;
  height: number;
  rgb: string;
  live: boolean;
  videoUrl: string | null;
}

export interface MediaServiceDeps {
  store: MediaStore;
  repo: ImageRepo;
  generateId?: () => string;
}

const KEY_ATTEMPTS = 3;
const NAME_MAX = 128;

// 去掉路径，截断到 128 字符（只做记录）
export function cleanOriginalName(name: string): string {
  return [...(name.split(/[\\/]/).pop() ?? "")].slice(0, NAME_MAX).join("");
}

export function createMediaService({ store, repo, generateId = generateImageId }: MediaServiceDeps) {
  async function freshKey(parts: Omit<Parameters<typeof buildImageKey>[0], "id">): Promise<string> {
    for (let attempt = 0; attempt < KEY_ATTEMPTS; attempt++) {
      const key = buildImageKey({ ...parts, id: generateId() });
      if (!(await store.exists(key))) return key;
    }
    throw new UploadFailedError("image id collision");
  }

  return {
    async upload({ file, now, ...fields }: UploadInput): Promise<UploadResult> {
      const { rgb } = validateUploadFields(fields);
      checkImageSize(file.size);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const image = sniffImage(bytes.subarray(0, SNIFF_BYTES));
      if (!image) throw new UnsupportedTypeError();

      const key = await freshKey({ width: image.width, height: image.height, rgb, ext: image.ext, now });
      try {
        await store.put(key, bytes, image.mime);
      } catch (error) {
        throw new UploadFailedError(error);
      }
      try {
        await repo.insert({ key, mime: image.mime, size: file.size, width: image.width, height: image.height, rgb, originalName: cleanOriginalName(file.name), createdAt: now });
      } catch (error) {
        await store.delete(key);
        throw new UploadFailedError(error);
      }
      return { url: keyToUrl(key), width: image.width, height: image.height, rgb, live: false, videoUrl: null };
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
