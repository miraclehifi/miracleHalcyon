// 豆瓣导入集成测试共用（US-04）：fetch 按 URL 返回 tests/fixtures/douban 的 interests-* 夹具并记录外发请求；导入 / 状态 / 结束三个路由的调用
import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import bookMangaTags from "../../fixtures/douban/book-manga-tags.json";
import gameVideo from "../../fixtures/douban/game-video.json";
import bookDone from "../../fixtures/douban/interests-book-done.json";
import bookDoneManga from "../../fixtures/douban/interests-book-done-manga.json";
import gameDone from "../../fixtures/douban/interests-game-done.json";
import movieDoing from "../../fixtures/douban/interests-movie-doing.json";
import movieDone from "../../fixtures/douban/interests-movie-done.json";
import movieDoneDoing2Done from "../../fixtures/douban/interests-movie-done-doing2done.json";
import movieDoneIncr from "../../fixtures/douban/interests-movie-done-incr.json";
import movieDoneMixed from "../../fixtures/douban/interests-movie-done-mixed.json";
import movieDoneP2 from "../../fixtures/douban/interests-movie-done-p2.json";
import movieDoneP3 from "../../fixtures/douban/interests-movie-done-p3.json";
import type { ShelfRouteDeps } from "../../../src/lib/api/shelf-http";
import { createImportHandler } from "../../../src/pages/api/admin/shelf/import";
import { createImportFinishHandler } from "../../../src/pages/api/admin/shelf/import/finish";
import { createImportStateHandler } from "../../../src/pages/api/admin/shelf/import/state";
import { JPG, NOW, SITE } from "./shelf-fixtures";

export const UID = "189806038";
export const W = "2026-10-18 08:25:08";
export const REXXAR = "https://m.douban.com/rexxar/api/v2/";
export const FIXTURES = { movieDone, movieDoneP2, movieDoneP3, movieDoing, bookDone, bookDoneManga, gameDone, movieDoneIncr, movieDoneDoing2Done, movieDoneMixed };
export const MANGA = ["36484713", "36265242", "36145936"]; // 书读过页中按漫画打桩的 3 本
export const TAGS_FAIL = "35929511"; // 标签请求失败 → 按书处理

type Route = (url: URL, init?: RequestInit) => Response | Promise<Response>;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// pages：`${type}·${status}·${start}` → 夹具或 Response；未列出的标记页返回空列表
export function fakeDouban(pages: Record<string, unknown> = {}, overrides: Record<string, Route> = {}) {
  const requests: { url: string; redirect: RequestRedirect | undefined }[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    requests.push({ url: url.href, redirect: init?.redirect });
    const override = Object.entries(overrides).find(([prefix]) => url.href.startsWith(prefix))?.[1];
    if (override) return override(url, init);
    if (url.href.startsWith(`${REXXAR}user/`)) {
      const page = pages[`${url.searchParams.get("type")}·${url.searchParams.get("status")}·${url.searchParams.get("start")}`];
      return page instanceof Response ? page : json(page ?? { start: 0, count: 20, total: 0, interests: [] });
    }
    const tags = /book\/(\d+)\/tags$/.exec(url.pathname)?.[1];
    if (tags) return tags === TAGS_FAIL ? new Response("err", { status: 500 }) : json(MANGA.includes(tags) ? bookMangaTags : { tags: ["小说"] });
    if (url.href.startsWith(`${REXXAR}game/`)) return json(gameVideo);
    if (url.hostname.endsWith(".doubanio.com")) return new Response(JPG);
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { fetchImpl, requests, lists: () => requests.filter((r) => r.url.includes("/interests?")) };
}

export function makeImport(fetchImpl: typeof fetch, extra: Partial<ShelfRouteDeps> = {}) {
  const hookCalls = { n: 0 };
  const deps: ShelfRouteDeps = { db: env.DB, bucket: env.MEDIA, now: () => NOW, fetch: fetchImpl, hooksFor: () => ({ onShelfChanged: async () => void hookCalls.n++ }), ...extra };
  const call = async (handler: (c: APIContext) => Promise<Response> | Response, method: string, path: string, body?: unknown) => {
    const request = new Request(`${SITE}${path}`, { method, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    const response = await handler({ request, url: new URL(request.url), params: {}, locals: {} } as unknown as APIContext);
    const text = await response.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 断言里按多种响应形状取字段
    return { status: response.status, body: (text ? JSON.parse(text) : null) as Record<string, any> | null };
  };
  const importHandler = createImportHandler(deps);
  return {
    hookCalls,
    page: (body: unknown) => call(importHandler, "POST", "/api/admin/shelf/import", body),
    state: (uid?: string) => call(createImportStateHandler(deps), "GET", `/api/admin/shelf/import/state${uid === undefined ? "" : `?uid=${encodeURIComponent(uid)}`}`),
    finish: (body: unknown) => call(createImportFinishHandler(deps), "POST", "/api/admin/shelf/import/finish", body),
  };
}

export const req = (extra: Record<string, unknown> = {}) => ({ uid: UID, kind: "movie", status: "done", types: ["movie", "series"], mode: "full", start: 0, ...extra });

export interface EntryRow {
  id: number;
  type: string;
  title: string;
  creator: string | null;
  year: number | null;
  status: string;
  rating: number | null;
  marked_on: string;
  comment: string | null;
  cover_key: string | null;
  douban_id: string;
  douban_url: string;
  hidden: number;
  platform: string | null;
  cover_url: string | null;
  cover_width: number | null;
  cover_height: number | null;
  created_at: string;
  updated_at: string;
}

export const entryOf = (doubanId: string) => env.DB.prepare("SELECT * FROM shelf_entries WHERE douban_id = ?").bind(doubanId).first<EntryRow>();
export const entryCount = async () => (await env.DB.prepare("SELECT COUNT(*) AS n FROM shelf_entries").first<{ n: number }>())!.n;
export const watermarkOf = (type: string, status = "done", uid = UID) =>
  env.DB.prepare("SELECT watermark, synced_at AS syncedAt, attempted_at AS attemptedAt FROM shelf_import_state WHERE uid = ? AND type = ? AND status = ?").bind(uid, type, status).first<{ watermark: string | null; syncedAt: string | null; attemptedAt: string }>();

export async function resetShelf() {
  await env.DB.batch([env.DB.prepare("DELETE FROM shelf_entries"), env.DB.prepare("DELETE FROM shelf_import_state")]);
}

// 直接写入一条已有条目（绕过接口，便于构造隐藏、R2 封面、IGDB 封面）
export async function seedEntry(e: Partial<EntryRow> & { type: string; douban_id: string; douban_url: string }) {
  const row = { title: "旧标题", creator: null, year: null, status: "in_progress", rating: null, marked_on: "2020-01-01", comment: null, cover_key: null, hidden: 0, platform: null, cover_url: null, cover_width: null, cover_height: null, created_at: "2020-01-01T00:00:00.000Z", updated_at: "2020-01-01T00:00:00.000Z", ...e };
  const cols = Object.keys(row);
  await env.DB.prepare(`INSERT INTO shelf_entries (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).bind(...Object.values(row)).run();
  return (await entryOf(e.douban_id))!;
}

export async function seedWatermark(type: string, watermark: string | null, status = "done", uid = UID, attemptedAt = "2026-10-20T13:00:00.000Z") {
  await env.DB.prepare("INSERT INTO shelf_import_state (uid, type, status, watermark, synced_at, attempted_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(uid, type, status, watermark, watermark ? "2026-10-23T13:30:00.000Z" : null, attemptedAt).run();
}
