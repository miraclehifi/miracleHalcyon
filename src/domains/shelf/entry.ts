// shelf 纯领域逻辑（shelf domain-model §1）：分类与状态文案、输入校验、排序、封面 key。无 I/O，前端表单与读者页共用
import { ShelfValidationError } from "./errors";

export const SHELF_TYPES = ["book", "comic", "movie", "series", "game", "boardgame"] as const;
export type ShelfType = (typeof SHELF_TYPES)[number];
export const SHELF_STATUSES = ["completed", "in_progress"] as const;
export type ShelfStatus = (typeof SHELF_STATUSES)[number];
export type DoubanKind = "book" | "movie" | "game";

export const isShelfType = (value: unknown): value is ShelfType => SHELF_TYPES.includes(value as ShelfType);
export const isShelfStatus = (value: unknown): value is ShelfStatus => SHELF_STATUSES.includes(value as ShelfStatus);

export const TYPE_LABELS: Record<ShelfType, string> = { book: "书", comic: "漫画", movie: "电影", series: "剧集", game: "游戏", boardgame: "桌游" };

type Verb = "read" | "watch" | "play";
const VERB_OF: Record<ShelfType, Verb> = { book: "read", comic: "read", movie: "watch", series: "watch", game: "play", boardgame: "play" };
const STATUS_TEXT: Record<Verb, Record<ShelfStatus, string>> = {
  read: { completed: "读过", in_progress: "在读" },
  watch: { completed: "看过", in_progress: "在看" },
  play: { completed: "玩过", in_progress: "在玩" },
};
const CREATOR_TEXT: Record<Verb, string> = { read: "作者", watch: "导演", play: "开发商" };
const UNIT_TEXT: Record<Verb, string> = { read: "本", watch: "部", play: "款" };

export const statusLabel = (type: ShelfType, status: ShelfStatus) => STATUS_TEXT[VERB_OF[type]][status];
export const creatorLabel = (type: ShelfType) => CREATOR_TEXT[VERB_OF[type]];

export function countLabel(type: ShelfType, total: number, inProgress: number): string {
  const base = `${total} ${UNIT_TEXT[VERB_OF[type]]}`;
  return inProgress > 0 ? `${base} · ${statusLabel(type, "in_progress")} ${inProgress}` : base;
}

export const TITLE_MAX = 200;
export const CREATOR_MAX = 200;
export const COMMENT_MAX = 1000;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;

export interface EntryData {
  type: ShelfType;
  title: string;
  creator: string | null;
  year: number | null;
  status: ShelfStatus;
  rating: number | null;
  markedOn: string;
  comment: string | null;
  douban: { id: string; url: string } | null;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DOUBAN_ID = /^\d{1,12}$/;
const codePoints = (s: string) => [...s].length;

export function isDateOnly(value: unknown): value is string {
  const match = typeof value === "string" ? DATE.exec(value) : null;
  if (!match) return false;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function optionalText(value: unknown, max: number, field: string, invalid: Set<string>, keepNewlines = false): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    invalid.add(field);
    return null;
  }
  const text = (keepNewlines ? value.replace(/\r\n?/g, "\n") : value).trim();
  if (text === "") return null;
  if (codePoints(text) > max) invalid.add(field);
  return text;
}

function optionalInt(value: unknown, min: number, max: number, field: string, invalid: Set<string>): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) invalid.add(field);
  return value as number;
}

// 校验并规范化写入字段；未知字段忽略。豆瓣链接须与条目 ID 对应的规范链接一致
export function normalizeEntryInput(raw: unknown): EntryData {
  const body = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const invalid = new Set<string>();
  if (!isShelfType(body.type)) invalid.add("type");
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (title === "" || codePoints(title) > TITLE_MAX) invalid.add("title");
  const creator = optionalText(body.creator, CREATOR_MAX, "creator", invalid);
  const year = optionalInt(body.year, 1000, 9999, "year", invalid);
  if (!isShelfStatus(body.status)) invalid.add("status");
  const rating = optionalInt(body.rating, 1, 5, "rating", invalid);
  if (!isDateOnly(body.markedOn)) invalid.add("markedOn");
  const comment = optionalText(body.comment, COMMENT_MAX, "comment", invalid, true);
  const douban = parseDoubanRef(body.doubanId, body.doubanUrl, invalid);
  if (invalid.size > 0) throw new ShelfValidationError(ENTRY_FIELDS.filter((field) => invalid.has(field)));
  return { type: body.type as ShelfType, title, creator, year, status: body.status as ShelfStatus, rating, markedOn: body.markedOn as string, comment, douban };
}

export const ENTRY_FIELDS = ["type", "title", "creator", "year", "status", "rating", "markedOn", "comment", "doubanUrl"];

function parseDoubanRef(id: unknown, url: unknown, invalid: Set<string>): EntryData["douban"] {
  const noId = id === null || id === undefined || id === "";
  const noUrl = url === null || url === undefined || url === "";
  if (noId && noUrl) return null;
  if (typeof id !== "string" || !DOUBAN_ID.test(id) || typeof url !== "string") {
    invalid.add("doubanUrl");
    return null;
  }
  const kind = doubanKindOfUrl(url);
  if (!kind || canonicalDoubanUrl(kind, id) !== url) {
    invalid.add("doubanUrl");
    return null;
  }
  return { id, url };
}

export function canonicalDoubanUrl(kind: DoubanKind, id: string): string {
  if (kind === "game") return `https://www.douban.com/game/${id}/`;
  return `https://${kind}.douban.com/subject/${id}/`;
}

function doubanKindOfUrl(url: string): DoubanKind | null {
  if (url.startsWith("https://book.douban.com/")) return "book";
  if (url.startsWith("https://movie.douban.com/")) return "movie";
  if (url.startsWith("https://www.douban.com/game/")) return "game";
  return null;
}

export interface SortableEntry {
  id: number;
  status: ShelfStatus;
  markedOn: string;
}

// 进行中在前 → 标记日期降序 → id 降序（同日新建的在前，结果确定）
export function sortEntries<T extends SortableEntry>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => {
    if (a.status !== b.status) return a.status === "in_progress" ? -1 : 1;
    if (a.markedOn !== b.markedOn) return a.markedOn < b.markedOn ? 1 : -1;
    return b.id - a.id;
  });
}

export type CoverMime = "image/jpeg" | "image/png" | "image/webp";
const COVER_EXT: Record<CoverMime, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const startsWith = (bytes: Uint8Array, sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

export function detectCoverType(bytes: Uint8Array): CoverMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

const KEY_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
export const COVER_KEY = /^covers\/\d{4}\/\d{2}\/[a-z2-7]{12}\.(jpg|png|webp)$/;

export function randomCoverId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => KEY_ALPHABET[byte & 31]).join("");
}

export function newCoverKey(now: Date, mime: CoverMime, random: string = randomCoverId()): string {
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `covers/${now.getUTCFullYear()}/${mm}/${random}.${COVER_EXT[mime]}`;
}

export const isCoverKey = (value: string) => COVER_KEY.test(value);
export const coverUrl = (key: string | null) => (key ? `/${key}` : null);
