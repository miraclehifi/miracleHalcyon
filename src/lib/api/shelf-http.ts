// 书影音接口共用（shelf api-contract）：服务装配、multipart 解析、条目视图、领域错误 → HTTP 错误体
import type { APIContext } from "astro";
import { R2CoverStore } from "../../domains/shelf/cover-store";
import { createDoubanClient } from "../../domains/shelf/douban/client";
import { coverUrl } from "../../domains/shelf/entry";
import { CoverTooLargeError, CoverTypeError, DuplicateDoubanError, EntryNotFoundError, RecognizeError, ShelfValidationError, type RecognizeCode } from "../../domains/shelf/errors";
import { noopShelfHooks, type ShelfHooks } from "../../domains/shelf/hooks";
import { D1ShelfRepo, type ShelfEntry } from "../../domains/shelf/repo";
import { createShelfService, type CoverChange, type CoverUpload } from "../../domains/shelf/service";
import { jsonError } from "./errors";

export const ENTRY_PAYLOAD_MAX = 6 * 1024 * 1024; // 封面 5 MiB + 表单开销

export interface ShelfRouteDeps {
  db: D1Database;
  bucket: R2Bucket;
  now?: () => Date;
  hooksFor?: (context: APIContext) => ShelfHooks;
  fetch?: typeof fetch; // 识别时请求豆瓣；测试注入替身
  recognizeTimeoutMs?: number;
}

export function shelfServiceFor({ db, bucket, now, hooksFor = () => noopShelfHooks, fetch: fetchImpl, recognizeTimeoutMs }: ShelfRouteDeps, context: APIContext) {
  return createShelfService({
    repo: new D1ShelfRepo(db),
    store: new R2CoverStore(bucket),
    hooks: hooksFor(context),
    douban: createDoubanClient(fetchImpl),
    recognizeTimeoutMs,
    now,
  });
}

export class BadRequestError extends Error {
  readonly code = "BAD_REQUEST";
}

const FIELD_MESSAGES: Record<string, string> = {
  type: "分类不正确",
  title: "请填写标题（不超过 200 字）",
  creator: "作者 / 导演 / 开发商不能超过 200 字",
  year: "年份为 4 位数字",
  status: "状态不正确",
  rating: "评分须为 1–5",
  markedOn: "标记日期格式不正确",
  comment: "短评不能超过 1000 字",
  doubanUrl: "豆瓣链接不正确",
  text: "请粘贴豆瓣分享链接或分享文字（不超过 10,000 字）",
};

const RECOGNIZE_MESSAGES: Record<RecognizeCode, string> = {
  NOT_DOUBAN_LINK: "不是豆瓣链接",
  NOT_SUBJECT_LINK: "不是豆瓣条目链接，请粘贴书 / 电影 / 游戏条目的分享链接",
  FETCH_FAILED: "链接打不开",
  PARSE_FAILED: "解析不出条目信息",
};

// 路由参数中的条目 id：只接受正整数，其余视为不存在
export function parseEntryId(param: string | undefined): number | null {
  if (!param || !/^[1-9]\d{0,14}$/.test(param)) return null;
  return Number(param);
}

export interface EntryForm {
  fields: unknown;
  cover?: CoverUpload;
  coverChange: CoverChange;
}

// multipart：fields（JSON）+ 可选 cover 文件 + 可选 coverAction（keep / remove）
export async function readEntryForm(request: Request): Promise<EntryForm> {
  if (Number(request.headers.get("Content-Length") ?? 0) > ENTRY_PAYLOAD_MAX) throw new CoverTooLargeError();
  let data: FormData;
  try {
    data = await request.formData();
  } catch {
    throw new BadRequestError("请求不是 multipart 表单");
  }
  const raw = data.get("fields");
  if (typeof raw !== "string") throw new BadRequestError("缺少 fields");
  let fields: unknown;
  try {
    fields = JSON.parse(raw);
  } catch {
    throw new BadRequestError("fields 不是有效的 JSON");
  }
  const file = data.get("cover");
  const action = data.get("coverAction");
  if (action !== null && action !== "keep" && action !== "remove") throw new BadRequestError("coverAction 不正确");
  if (file !== null && !(file instanceof File)) throw new BadRequestError("cover 必须是文件");
  if (file && action === "remove") throw new BadRequestError("不能同时上传和移除封面");
  const cover = file ? { bytes: new Uint8Array(await file.arrayBuffer()) } : undefined;
  return { fields, cover, coverChange: cover ?? (action === "remove" ? "remove" : "keep") };
}

export function entryView(entry: ShelfEntry) {
  return {
    id: String(entry.id),
    type: entry.type,
    title: entry.title,
    creator: entry.creator,
    year: entry.year,
    status: entry.status,
    rating: entry.rating,
    markedOn: entry.markedOn,
    comment: entry.comment,
    cover: coverUrl(entry.coverKey),
    doubanUrl: entry.douban?.url ?? null,
    doubanId: entry.douban?.id ?? null,
    hidden: entry.hidden,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export type ShelfEntryView = ReturnType<typeof entryView>;

export function shelfErrorResponse(error: unknown): Response {
  if (error instanceof ShelfValidationError) {
    const message = error.fields.map((field) => FIELD_MESSAGES[field] ?? `${field} 不符合要求`).join("；");
    return Response.json({ error: { code: error.code, message, fields: error.fields } }, { status: 400 });
  }
  if (error instanceof BadRequestError) return jsonError(400, error.code, error.message);
  if (error instanceof RecognizeError) return jsonError(422, error.code, RECOGNIZE_MESSAGES[error.code]);
  if (error instanceof CoverTypeError) return jsonError(400, error.code, "封面只支持 jpg / png / webp");
  if (error instanceof CoverTooLargeError) return jsonError(400, error.code, "封面不能超过 5 MB");
  if (error instanceof EntryNotFoundError) return jsonError(404, error.code, "条目不存在或已被删除");
  if (error instanceof DuplicateDoubanError) {
    const existing = error.existing ? { id: String(error.existing.id), title: error.existing.title } : null;
    return Response.json({ error: { code: error.code, message: "这条已经录入过", existing } }, { status: 409 });
  }
  throw error;
}
