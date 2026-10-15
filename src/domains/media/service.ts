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

const prefix = async (blob: Blob, bytes: number) => new Uint8Array(await blob.slice(0, bytes).arrayBuffer());

// 只读前缀嗅探；JPEG 的 SOF 可能在数百 KB 的 EXIF / 厂商私有段之后，前缀里找不到时逐步扩大到整个文件
const JPEG_PREFIXES = [SNIFF_BYTES, 1024 * 1024, 8 * 1024 * 1024];
async function sniffImageBlob(file: Blob) {
  const head = await prefix(file, SNIFF_BYTES);
  const found = sniffImage(head);
  if (found || head[0] !== 0xff || head[1] !== 0xd8 || file.size <= SNIFF_BYTES) return found;
  for (const size of [...JPEG_PREFIXES.slice(1), file.size]) {
    const image = sniffImage(await prefix(file, size));
    if (image || size >= file.size) return image;
  }
  return null;
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

  async function putOrRollback(written: string[], key: string, body: Blob, contentType: string) {
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
      const image = await sniffImageBlob(file);
      if (!image) throw new UnsupportedTypeError();
      if (video && !sniffVideo(await prefix(video, SNIFF_BYTES))) throw new UnsupportedTypeError();

      // 写 R2 直接传表单里的 Blob：表单解析已在内存中占一份，不再复制（Workers 每个 isolate 128MB）
      const key = await freshKey({ width: image.width, height: image.height, rgb, ext: image.ext, now });
      const videoKey = video ? videoKeyFor(key) : null;
      const written: string[] = [];
      await putOrRollback(written, key, file, image.mime);
      if (video && videoKey) await putOrRollback(written, videoKey, video, VIDEO_MIME);
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
          ...(video && videoKey && { video: { key: videoKey, size: video.size } }),
        });
      } catch (error) {
        await rollback(written, error);
      }
      return { url: keyToUrl(key), width: image.width, height: image.height, rgb, live: videoKey !== null, videoUrl: videoKey ? keyToUrl(videoKey) : null };
    },
  };
}

export type MediaService = ReturnType<typeof createMediaService>;
