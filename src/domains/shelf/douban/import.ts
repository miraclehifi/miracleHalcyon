// 豆瓣标记列表 → 导入字段（shelf domain-model §2.4，ADR-014 §3）：纯函数，前端导入弹窗共用 ID 校验与导入计划
import { canonicalDoubanUrl, COMMENT_MAX, isDateOnly, TITLE_MAX, CREATOR_MAX, type ShelfPlatform, type ShelfStatus, type ShelfType } from "../entry";
import { DoubanParseError, ImportItemError } from "../errors";
import { creatorOf, isBoardGame, isComic, yearFor } from "./map";

export type ImportKind = "movie" | "book" | "game";
export type ImportStatus = "done" | "doing";
export type ImportMode = "full" | "incremental";

export const IMPORT_KINDS: readonly ImportKind[] = ["movie", "book", "game"];
export const IMPORT_STATUSES: readonly ImportStatus[] = ["done", "doing"];
export const IMPORT_PAGE_SIZE = 20;
export const IMPORT_START_MAX = 100_000;

// 豆瓣大类 → 本站分类（顺序即导入弹窗、同步状态的顺序）
export const KIND_TYPES: Record<ImportKind, readonly ShelfType[]> = { movie: ["movie", "series"], book: ["book", "comic"], game: ["game", "boardgame"] };
export const IMPORT_TYPES: readonly ShelfType[] = IMPORT_KINDS.flatMap((kind) => KIND_TYPES[kind]);

export interface ImportStep {
  kind: ImportKind;
  status: ImportStatus;
}

export const IMPORT_STEPS: readonly ImportStep[] = IMPORT_KINDS.flatMap((kind) => IMPORT_STATUSES.map((status) => ({ kind, status })));

// 按 IMPORT_STEPS 顺序只保留含勾选类别的大类，每步带该大类内勾选的类别
export function importPlan(types: readonly ShelfType[]): (ImportStep & { types: ShelfType[] })[] {
  return IMPORT_STEPS.map((step) => ({ ...step, types: KIND_TYPES[step.kind].filter((t) => types.includes(t)) })).filter((step) => step.types.length > 0);
}

const UID = /^[A-Za-z0-9_.-]{1,64}$/;
export const isValidDoubanUid = (uid: unknown): uid is string => typeof uid === "string" && UID.test(uid) && uid !== "." && uid !== "..";

// 豆瓣 create_time 原文（北京时间）；同格式字符串按字典序比较即时间先后
const TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
export const isDoubanTimestamp = (value: unknown): value is string => typeof value === "string" && TIMESTAMP.test(value);

export interface InterestPage {
  total: number;
  interests: unknown[];
}

export function parseInterestPage(raw: unknown): InterestPage {
  const json = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
  const total = json?.total;
  if (typeof total !== "number" || !Number.isInteger(total) || total < 0) throw new DoubanParseError("标记列表没有 total");
  return { total, interests: Array.isArray(json!.interests) ? json!.interests : [] };
}

// 豆瓣缺失的字段为 undefined（已有条目保留原值）；null 表示豆瓣有值且为空（未评分、无短评）
export interface ImportedFields {
  type: ShelfType;
  title: string;
  creator?: string;
  year?: number;
  status: ShelfStatus;
  rating: number | null;
  markedOn: string;
  comment: string | null;
  platform?: ShelfPlatform;
  douban: { id: string; url: string };
}

export interface MappedInterest {
  doubanId: string;
  fields: ImportedFields;
  coverUrl: string | null; // 游戏恒为 null（ADR-013）
}

export interface InterestExtra {
  tags?: string[]; // 书：book/{id}/tags
  game?: unknown; // 游戏：game/{id} 详情（开发商）
}

type Json = Record<string, unknown>;
const asObject = (value: unknown): Json | null => (value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : null);
const DOUBAN_ID = /^\d{1,12}$/;
const STATUS_OF: Record<ImportStatus, ShelfStatus> = { done: "completed", doing: "in_progress" };
const PLATFORM_OF: Record<string, ShelfPlatform> = { ps5: "ps5", ps4: "ps4", ns: "switch", "ns 2": "switch2", ns2: "switch2", pc: "steam" };

const clip = (text: string, max: number) => {
  const points = [...text];
  return points.length > max ? points.slice(0, max).join("") : text;
};

function typeOf(kind: ImportKind, subject: Json, extra: InterestExtra): ShelfType {
  if (kind === "book") return isComic(extra.tags ?? []) ? "comic" : "book";
  if (kind === "game") return isBoardGame(subject.genres) ? "boardgame" : "game";
  return subject.type === "tv" ? "series" : "movie";
}

function platformOf(platforms: unknown): ShelfPlatform | undefined {
  if (!Array.isArray(platforms)) return undefined;
  for (const p of platforms) {
    const abbreviation = asObject(p)?.abbreviation;
    const platform = typeof abbreviation === "string" ? PLATFORM_OF[abbreviation.trim().toLowerCase()] : undefined;
    if (platform) return platform;
  }
  return undefined;
}

function coverOf(subject: Json): string | null {
  const pic = asObject(subject.pic);
  for (const candidate of [subject.cover_url, pic?.large]) if (typeof candidate === "string" && candidate) return candidate;
  return null;
}

function commentOf(value: unknown): string | null {
  const text = typeof value === "string" ? value.replace(/\r\n?/g, "\n").trim() : "";
  return text === "" ? null : clip(text, COMMENT_MAX);
}

export function mapInterest(kind: ImportKind, raw: unknown, extra: InterestExtra): MappedInterest | { skip: true } {
  const interest = asObject(raw);
  const subject = asObject(interest?.subject);
  const id = subject?.id;
  const doubanId = typeof id === "string" && DOUBAN_ID.test(id) ? id : null;
  if (!interest || interest.status !== "done" && interest.status !== "doing") {
    if (interest && typeof interest.status === "string") return { skip: true }; // 想看等其他状态
    throw new ImportItemError(doubanId, "PARSE_FAILED");
  }
  const title = typeof subject?.title === "string" ? subject.title.trim() : "";
  if (!subject || !doubanId || !title) throw new ImportItemError(doubanId, "PARSE_FAILED", title || null);
  const createTime = interest.create_time;
  const markedOn = isDoubanTimestamp(createTime) ? createTime.slice(0, 10) : "";
  if (!isDateOnly(markedOn)) throw new ImportItemError(doubanId, "PARSE_FAILED", title);

  const type = typeOf(kind, subject, extra);
  const creator = kind === "game" ? (asObject(extra.game) ? creatorOf("game", asObject(extra.game)!) : null) : creatorOf(kind, subject);
  const year = yearFor(kind, subject);
  const platform = type === "game" ? platformOf(interest.platforms) : undefined;
  const ratingValue = asObject(interest.rating)?.value;
  const fields: ImportedFields = {
    type,
    title: clip(title, TITLE_MAX),
    ...(creator !== null && { creator: clip(creator, CREATOR_MAX) }),
    ...(year !== null && year >= 1000 && year <= 9999 && { year }),
    status: STATUS_OF[interest.status],
    rating: typeof ratingValue === "number" && Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5 ? ratingValue : null,
    markedOn,
    comment: commentOf(interest.comment),
    ...(platform && { platform }),
    douban: { id: doubanId, url: canonicalDoubanUrl(kind, doubanId) },
  };
  return { doubanId, fields, coverUrl: kind === "game" ? null : coverOf(subject) };
}
