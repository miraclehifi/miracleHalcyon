// POST /api/admin/images（media api-contract）：上传一张图片，或图片 + 实况视频。会话与 Origin 已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { FileTooLargeError, MediaValidationError, UnsupportedTypeError, UploadFailedError, VideoTooLargeError } from "../../../domains/media/errors";
import { D1ImageRepo, R2MediaStore, type ImageRepo, type MediaStore } from "../../../domains/media/repo";
import { createMediaService } from "../../../domains/media/service";
import { jsonError } from "../../../lib/api/errors";

export const prerender = false;

export const PAYLOAD_MAX_BYTES = 16 * 1024 * 1024;
const UNSUPPORTED_MESSAGE = "不支持的图片格式";
const FIELD_MESSAGES: Record<string, string> = {
  file: UNSUPPORTED_MESSAGE, // 缺少文件、0 字节或只有视频（TC-US05-16、TC-US11-13）
  video: "实况视频为空",
  rgb: "主色格式不正确",
  width: "宽度格式不正确",
  height: "高度格式不正确",
};

export interface UploadImageHandlerDeps {
  db: D1Database;
  bucket: R2Bucket;
  now?: () => Date;
  repo?: ImageRepo;
  store?: MediaStore;
}

const optionalText = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : undefined);

function errorResponse(error: unknown): Response {
  if (error instanceof MediaValidationError) {
    const message = error.fields.map((field) => FIELD_MESSAGES[field] ?? `${field} 不符合要求`).join("；");
    return Response.json({ error: { code: error.code, message, fields: error.fields } }, { status: 400 });
  }
  if (error instanceof UnsupportedTypeError) return jsonError(400, error.code, UNSUPPORTED_MESSAGE);
  if (error instanceof FileTooLargeError) return jsonError(413, error.code, "图片不能超过 5MB");
  if (error instanceof VideoTooLargeError) return jsonError(413, error.code, "实况视频不能超过 10MB");
  if (error instanceof UploadFailedError) {
    console.error("image upload failed", error.cause);
    return jsonError(500, error.code, "上传失败，请重试");
  }
  throw error;
}

export function createUploadImageHandler({ db, bucket, now = () => new Date(), repo = new D1ImageRepo(db), store = new R2MediaStore(bucket) }: UploadImageHandlerDeps): APIRoute {
  const service = createMediaService({ store, repo });
  return async ({ request }) => {
    if (Number(request.headers.get("Content-Length") ?? 0) > PAYLOAD_MAX_BYTES) return jsonError(413, "PAYLOAD_TOO_LARGE", "上传内容过大");
    let data: FormData;
    try {
      data = await request.formData();
    } catch {
      return errorResponse(new MediaValidationError(["file"]));
    }
    const file = data.get("file");
    const video = data.get("video");
    try {
      if (!(file instanceof File)) throw new MediaValidationError(["file"]);
      if (video !== null && !(video instanceof File)) throw new MediaValidationError(["video"]);
      const result = await service.upload({
        file,
        video: video ?? undefined,
        rgb: optionalText(data.get("rgb")),
        width: optionalText(data.get("width")),
        height: optionalText(data.get("height")),
        now: now(),
      });
      return Response.json(result, { status: 201 });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export const POST: APIRoute = (context) => createUploadImageHandler({ db: env.DB, bucket: env.MEDIA })(context);
