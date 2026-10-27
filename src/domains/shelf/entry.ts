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

// 游戏平台（ADR-013 §1）：游戏必填，其他分类为 null；图标为 Simple Icons 路径名
export const SHELF_PLATFORMS = ["ps5", "ps4", "switch", "switch2", "steam"] as const;
export type ShelfPlatform = (typeof SHELF_PLATFORMS)[number];
export const isShelfPlatform = (value: unknown): value is ShelfPlatform => SHELF_PLATFORMS.includes(value as ShelfPlatform);
const PLATFORM_LABELS: Record<ShelfPlatform, string> = { ps5: "PS5", ps4: "PS4", switch: "Switch", switch2: "Switch 2", steam: "Steam" };
const PLATFORM_ICONS: Record<ShelfPlatform, string> = { ps5: "playstation", ps4: "playstation", switch: "nintendoswitch", switch2: "nintendoswitch", steam: "steam" };
export const platformLabel = (platform: ShelfPlatform) => PLATFORM_LABELS[platform];
export const platformIcon = (platform: ShelfPlatform) => PLATFORM_ICONS[platform];

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
  platform: ShelfPlatform | null;
  coverUrl: string | null; // 仅游戏：IGDB 规范大图地址
  coverWidth: number | null; // 与 coverUrl 同时有或同时无；normalizeEntryInput 不填，由服务读取
  coverHeight: number | null;
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
  const isGame = body.type === "game";
  if (isGame && !isShelfPlatform(body.platform)) invalid.add("platform");
  const coverUrl = isGame ? parseIgdbCoverUrl(body.coverUrl, invalid) : null;
  if (invalid.size > 0) throw new ShelfValidationError(ENTRY_FIELDS.filter((field) => invalid.has(field)));
  return {
    type: body.type as ShelfType, title, creator, year, status: body.status as ShelfStatus, rating, markedOn: body.markedOn as string, comment, douban,
    platform: isGame ? (body.platform as ShelfPlatform) : null, coverUrl, coverWidth: null, coverHeight: null,
  };
}

function parseIgdbCoverUrl(value: unknown, invalid: Set<string>): string | null {
  if (value === null || value === undefined || value === "") return null;
  const url = normalizeIgdbCoverUrl(value);
  if (url === null) invalid.add("coverUrl");
  return url;
}

// IGDB 封面链接规范化（ADR-013 §2）：只认 images.igdb.com 的图片地址，一律改写为 t_1080p jpg；不符返回 null
export const IGDB_URL_MAX = 2000;
const IGDB_PATH = /^\/igdb\/image\/upload\/t_[a-z0-9_]{1,32}\/([a-z0-9]{1,32})\.(jpg|jpeg|png|webp)$/;
export const igdbCoverUrl = (imageId: string) => `https://images.igdb.com/igdb/image/upload/t_1080p/${imageId}.jpg`;

export function normalizeIgdbCoverUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const text = input.trim();
  // URL 解析会消去 ../ 并把 \ 当作 /，先在原文上拒绝，保证路径与输入一致
  if (text === "" || text.length > IGDB_URL_MAX || text.includes("..") || text.includes("\\")) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.hostname !== "images.igdb.com" || url.username || url.password || url.port) return null;
  const match = IGDB_PATH.exec(url.pathname);
  return match ? igdbCoverUrl(match[1]) : null;
}

export interface ImageSize {
  width: number;
  height: number;
}

const u16be = (b: Uint8Array, i: number) => (b[i] << 8) | b[i + 1];
const u32be = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const u16le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8);
const u24le = (b: Uint8Array, i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const sized = (width: number, height: number): ImageSize | null => (width > 0 && height > 0 ? { width, height } : null);

// 由文件头解析宽高（jpeg / png / webp）；数据不足或格式不认返回 null
export function readImageSize(bytes: Uint8Array): ImageSize | null {
  const type = detectCoverType(bytes);
  if (type === "image/png") return bytes.length >= 24 && u32be(bytes, 12) === 0x49484452 ? sized(u32be(bytes, 16), u32be(bytes, 20)) : null;
  if (type === "image/jpeg") return readJpegSize(bytes);
  if (type === "image/webp") return readWebpSize(bytes);
  return null;
}

// SOF0–3、5–7、9–11、13–15（排除 DHT C4、JPG C8、DAC CC）
const isSof = (marker: number) => marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

function readJpegSize(b: Uint8Array): ImageSize | null {
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) return null;
    while (b[i] === 0xff) i++; // 段间填充字节
    if (i >= b.length) return null;
    const marker = b[i];
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i++;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null; // 图像结束 / 扫描开始前没有 SOF
    if (i + 2 >= b.length) return null;
    const length = u16be(b, i + 1);
    if (length < 2) return null;
    if (isSof(marker)) return i + 7 < b.length ? sized(u16be(b, i + 6), u16be(b, i + 4)) : null;
    i += 1 + length;
  }
  return null;
}

function readWebpSize(b: Uint8Array): ImageSize | null {
  if (b.length < 30) return null;
  const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
  if (chunk === "VP8 ") return b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a ? sized(u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff) : null;
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0;
    return sized((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (chunk === "VP8X") return sized(u24le(b, 24) + 1, u24le(b, 27) + 1);
  return null;
}

// 公开条目（api-contract ShelfPublicEntry）：读者页构建数据，不含 id、豆瓣 ID、隐藏标记与时间戳
export interface ShelfPublicEntry {
  type: ShelfType;
  title: string;
  creator: string | null;
  year: number | null;
  status: ShelfStatus;
  rating: number | null;
  markedOn: string;
  comment: string | null;
  cover: string | null; // 游戏为 IGDB 地址，其他为站内 /covers/ 路径
  doubanUrl: string | null;
  platform: ShelfPlatform | null;
  coverWidth: number | null;
  coverHeight: number | null;
}

export const isDoubanUrl = (value: string) => doubanKindOfUrl(value) !== null;

export const ENTRY_FIELDS = ["type", "title", "creator", "year", "status", "rating", "markedOn", "comment", "doubanUrl", "platform", "coverUrl"];

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
