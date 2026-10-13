// 文章接口共用：请求体解析与类型校验、领域错误 → HTTP 错误体（post api-contract §5）
import { normalizeContent, type DraftInput } from "../../domains/post/content";
import { MissingFieldsError, NotFoundError, NotPublishedError, SlugTakenError, ValidationError } from "../../domains/post/errors";
import { jsonError } from "./errors";

export const MAX_BODY_BYTES = 1024 * 1024; // PUT / POST 请求体上限 1MB

type DraftField = keyof DraftInput;
const DRAFT_FIELDS: DraftField[] = ["title", "slug", "tags", "summary", "body", "publishedAt"];

const FIELD_MESSAGES: Record<string, string> = {
  title: "标题不能超过 200 字",
  slug: "slug 只能包含小写字母、数字和连字符",
  tags: "标签最多 10 个，每个不超过 32 字",
  summary: "摘要不能超过 200 字",
  body: "正文不能超过 200,000 字",
  publishedAt: "发布日期格式不正确",
};
const PUBLISH_FIELD_NAMES: Record<string, string> = { title: "标题", slug: "slug", body: "正文" };

export class PayloadTooLargeError extends Error {
  readonly code = "PAYLOAD_TOO_LARGE";
}

export class BadJsonError extends Error {
  readonly code = "BAD_JSON";
}

// 超过上限先按 Content-Length 拒绝，再按实际长度兜底
export async function readJson(request: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  if (Number(request.headers.get("Content-Length") ?? 0) > maxBytes) throw new PayloadTooLargeError();
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new PayloadTooLargeError();
  try {
    return JSON.parse(text);
  } catch {
    throw new BadJsonError();
  }
}

const isString = (value: unknown): value is string => typeof value === "string";
const FIELD_TYPES: Record<DraftField, (value: unknown) => boolean> = {
  title: isString,
  slug: isString,
  tags: (value) => Array.isArray(value) && value.every(isString),
  summary: isString,
  body: isString,
  publishedAt: (value) => value === null || isString(value),
};
const EMPTY_DRAFT: DraftInput = { title: "", slug: "", tags: [], summary: "", body: "", publishedAt: null };

// 类型错误、缺字段（requireAll 时）与领域校验错误合并成一次 VALIDATION_FAILED，字段按固定顺序
export function parseDraftInput(raw: unknown, { requireAll }: { requireAll: boolean }): DraftInput {
  const body = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const invalid = new Set<string>();
  const input = { ...EMPTY_DRAFT } as Record<DraftField, unknown>;
  for (const field of DRAFT_FIELDS) {
    if (!(field in body)) {
      if (requireAll) invalid.add(field);
      continue;
    }
    if (FIELD_TYPES[field](body[field])) input[field] = body[field];
    else invalid.add(field);
  }
  const draft = input as unknown as DraftInput;
  try {
    normalizeContent(draft);
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    error.fields.forEach((field) => invalid.add(field));
  }
  if (invalid.size > 0) throw new ValidationError(DRAFT_FIELDS.filter((field) => invalid.has(field)));
  return draft;
}

// 领域错误 → 错误体；其他错误原样抛出（500）
export function errorResponse(error: unknown): Response {
  if (error instanceof ValidationError) {
    const message = error.fields.map((field) => FIELD_MESSAGES[field] ?? `${field} 不符合要求`).join("；");
    return Response.json({ error: { code: error.code, message, fields: error.fields } }, { status: 400 });
  }
  if (error instanceof BadJsonError) return jsonError(400, "VALIDATION_FAILED", "请求内容不是有效的 JSON");
  if (error instanceof PayloadTooLargeError) return jsonError(413, error.code, "内容过大");
  if (error instanceof NotFoundError) return jsonError(404, error.code, "文章不存在或已被删除");
  if (error instanceof SlugTakenError) return jsonError(409, error.code, "slug 已存在，请换一个");
  if (error instanceof NotPublishedError) return jsonError(409, error.code, "文章还没有发布");
  if (error instanceof MissingFieldsError) {
    const message = `发布前请填写：${error.fields.map((field) => PUBLISH_FIELD_NAMES[field]).join("、")}`;
    return Response.json({ error: { code: error.code, message, fields: error.fields } }, { status: 422 });
  }
  throw error;
}
