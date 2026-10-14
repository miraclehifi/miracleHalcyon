// media 领域服务（media domain-model §5）：校验 → 嗅探 → 生成 key → 写 R2（图片，再视频）→ 写 images；任一步失败不留残余
import { UnsupportedTypeError, UploadFailedError } from "./errors";
import { buildImageKey, generateImageId, keyToUrl, videoKeyFor } from "./key";
import type { ImageRepo, MediaStore } from "./repo";
import { checkImageSize, checkVideoSize, sniffImage, sniffVideo, SNIFF_BYTES, validateUploadFields, VIDEO_MIME, type UploadFields } from "./validate";

export interface UploadInput extends UploadFields {
  file: Blob & { name: string };
  video?: Blob; // 有则为实况照片
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

  // 写入失败时删除本次已写的对象，再报 UPLOAD_FAILED（不留半对，domain-model §2 不变量 1）；删除本身失败不掩盖原错误
  async function rollback(written: string[], error: unknown): Promise<never> {
    await Promise.allSettled(written.map((key) => store.delete(key)));
    throw new UploadFailedError(error);
  }

  async function putOrRollback(written: string[], key: string, body: Uint8Array, contentType: string) {
    try {
      await store.put(key, body, contentType);
      written.push(key);
    } catch (error) {
      await rollback(written, error);
    }
  }

  return {
    async upload({ file, video, now, ...fields }: UploadInput): Promise<UploadResult> {
      const { rgb } = validateUploadFields(fields);
      checkImageSize(file.size);
      if (video) checkVideoSize(video.size);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const image = sniffImage(bytes); // 整个文件：JPEG 的 SOF 可能在数百 KB 的 EXIF / 厂商私有段之后
      if (!image) throw new UnsupportedTypeError();
      const videoBytes = video ? new Uint8Array(await video.arrayBuffer()) : null;
      if (videoBytes && !sniffVideo(videoBytes.subarray(0, SNIFF_BYTES))) throw new UnsupportedTypeError();

      const key = await freshKey({ width: image.width, height: image.height, rgb, ext: image.ext, now });
      const videoKey = videoBytes ? videoKeyFor(key) : null;
      const written: string[] = [];
      await putOrRollback(written, key, bytes, image.mime);
      if (videoBytes && videoKey) await putOrRollback(written, videoKey, videoBytes, VIDEO_MIME);
      try {
        await repo.insert({
          key,
          mime: image.mime,
          size: file.size,
          width: image.width,
          height: image.height,
          rgb,
          originalName: cleanOriginalName(file.name),
          createdAt: now,
          ...(videoBytes && videoKey && { video: { key: videoKey, size: videoBytes.length } }),
        });
      } catch (error) {
        await rollback(written, error);
      }
      return { url: keyToUrl(key), width: image.width, height: image.height, rgb, live: videoKey !== null, videoUrl: videoKey ? keyToUrl(videoKey) : null };
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
