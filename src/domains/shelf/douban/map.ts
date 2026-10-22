// Rexxar 条目 JSON → 识别字段（shelf domain-model §2.3）：纯函数。字段路径由 spike 验证，夹具见 tests/fixtures/douban/
import type { DoubanKind, ShelfType } from "../entry";
import { DoubanParseError } from "../errors";

export type MissingField = "creator" | "year" | "cover";

export interface MappedSubject {
  fields: { type: ShelfType; title: string; creator: string | null; year: number | null };
  coverUrl: string | null;
  missing: MissingField[];
}

type Json = Record<string, unknown>;

const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);
const names = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => (v && typeof v === "object" ? (v as Json).name : undefined)).filter((v): v is string => typeof v === "string") : [];
const NATIONALITY = /^[[［(（][^\]］)）]{1,8}[\]］)）]\s*/;
const joinNames = (list: string[]) => {
  const cleaned = list.map((n) => n.replace(NATIONALITY, "").trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join("、") : null;
};
const yearOf = (value: unknown): number | null => {
  const match = typeof value === "string" ? /^(\d{4})/.exec(value.trim()) : null;
  return match ? Number(match[1]) : null;
};

function inferType(kind: DoubanKind, json: Json, bookTags: string[]): ShelfType {
  const genres = strings(json.genres);
  if (kind === "book") return bookTags.some((t) => t === "漫画") ? "comic" : "book";
  if (kind === "game") return genres.some((g) => g.includes("桌游")) ? "boardgame" : "game";
  if (json.is_tv === true) return "series"; // 动画剧集也归剧集（drop-anime-type）
  return "movie";
}

function creatorOf(kind: DoubanKind, json: Json): string | null {
  if (kind === "book") return joinNames(strings(json.author));
  if (kind === "game") return joinNames(strings(json.developers));
  return joinNames(names(json.directors));
}

function yearFor(kind: DoubanKind, json: Json): number | null {
  if (kind === "book") return yearOf(strings(json.pubdate)[0]);
  if (kind === "game") return yearOf(json.release_date);
  return yearOf(json.year);
}

function coverOf(json: Json): string | null {
  const pic = json.pic && typeof json.pic === "object" ? (json.pic as Json) : {};
  for (const candidate of [json.cover_url, pic.large, pic.normal]) if (typeof candidate === "string" && candidate) return candidate;
  return null;
}

export function mapSubject(kind: DoubanKind, raw: unknown, bookTags: string[]): MappedSubject {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new DoubanParseError("条目数据不是对象");
  const json = raw as Json;
  const title = typeof json.title === "string" ? json.title.trim() : "";
  if (!title) throw new DoubanParseError("条目数据没有标题");
  const fields = { type: inferType(kind, json, bookTags), title, creator: creatorOf(kind, json), year: yearFor(kind, json) };
  const coverUrl = coverOf(json);
  const missing: MissingField[] = [];
  if (fields.creator === null) missing.push("creator");
  if (fields.year === null) missing.push("year");
  if (coverUrl === null) missing.push("cover");
  return { fields, coverUrl, missing };
}
