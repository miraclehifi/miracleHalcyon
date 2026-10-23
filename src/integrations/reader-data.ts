// 读者页构建数据（ADR-007、reader module-spec §1.2–§1.3）：Vite 插件在 Node 中取数，
// 以虚拟模块 virtual:reader-data（文章）、virtual:shelf-data（书影音，ADR-012）注入预渲染页面；预渲染（workerd）中不再 fetch
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { isCoverKey, isDateOnly, isDoubanUrl, isShelfStatus, isShelfType, type ShelfPublicEntry } from "../domains/shelf/entry";
import { sortPublished } from "../lib/reader/sort";
import type { ReaderData, ReaderPost } from "../lib/reader/types";

const VIRTUAL_ID = "virtual:reader-data";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const SHELF_VIRTUAL_ID = "virtual:shelf-data";
const SHELF_RESOLVED_ID = `\0${SHELF_VIRTUAL_ID}`;
const FIXTURE_DIR = new URL("../../tests/fixtures/reader/", import.meta.url);
const DEFAULT_FIXTURE = "reader-fixture";
const DETAIL_CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 15_000;

export class ReaderDataError extends Error {
  override name = "ReaderDataError";
}

export interface LoadOptions {
  fixture?: string; // READER_FIXTURE
  apiOrigin?: string; // READER_API_ORIGIN
  bootstrap?: boolean; // READER_BOOTSTRAP=1：首次部署，取不到数据时以 0 篇构建
  dev?: boolean; // astro dev：未配置时用默认夹具
  fetch?: typeof fetch;
  readFixture?: (name: string) => Promise<string>;
  warn?: (message: string) => void;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPost(value: unknown): value is ReaderPost {
  const p = value as Record<string, unknown>;
  return (
    typeof p === "object" &&
    p !== null &&
    typeof p.slug === "string" &&
    SLUG.test(p.slug) &&
    typeof p.title === "string" &&
    typeof p.summary === "string" &&
    Array.isArray(p.tags) &&
    p.tags.every((t) => typeof t === "string") &&
    typeof p.publishedAt === "string" &&
    DATE.test(p.publishedAt) &&
    typeof p.lastPublishedAt === "string" &&
    typeof p.body === "string" &&
    (p.cover === null || typeof p.cover === "string")
  );
}

// 校验字段并排序；source 用于报错（夹具名或接口地址）
export function parseReaderData(raw: unknown, source: string): ReaderData {
  const posts = (raw as { posts?: unknown })?.posts;
  if (!Array.isArray(posts)) throw new ReaderDataError(`读者数据 ${source} 缺少 posts 数组`);
  for (const p of posts) {
    if (!isPost(p)) throw new ReaderDataError(`读者数据 ${source} 中的文章字段不合法：${(p as { slug?: unknown })?.slug ?? "（无 slug）"}`);
  }
  return { posts: sortPublished(posts as ReaderPost[]) };
}

export interface ShelfData {
  entries: ShelfPublicEntry[];
}

const nullOr = (value: unknown, check: (v: never) => boolean) => value === null || check(value as never);
const isRating = (v: number) => Number.isInteger(v) && v >= 1 && v <= 5;
const isYear = (v: number) => Number.isInteger(v);

function isShelfEntry(value: unknown): value is ShelfPublicEntry {
  const e = value as Record<string, unknown>;
  return (
    typeof e === "object" &&
    e !== null &&
    isShelfType(e.type) &&
    typeof e.title === "string" &&
    e.title.trim() !== "" &&
    nullOr(e.creator, (v) => typeof v === "string") &&
    nullOr(e.year, (v) => typeof v === "number" && isYear(v)) &&
    isShelfStatus(e.status) &&
    nullOr(e.rating, (v) => typeof v === "number" && isRating(v)) &&
    isDateOnly(e.markedOn) &&
    nullOr(e.comment, (v) => typeof v === "string") &&
    nullOr(e.cover, (v: string) => typeof v === "string" && v.startsWith("/") && isCoverKey(v.slice(1))) &&
    nullOr(e.doubanUrl, (v: string) => typeof v === "string" && isDoubanUrl(v))
  );
}

// 校验书影音条目；顺序保持接口输出（id 降序），分组排序交给 groupShelf
export function parseShelfData(raw: unknown, source: string): ShelfData {
  const entries = (raw as { entries?: unknown })?.entries;
  if (!Array.isArray(entries)) throw new ReaderDataError(`书影音数据 ${source} 缺少 entries 数组`);
  for (const e of entries) {
    if (!isShelfEntry(e)) {
      const title = (e as { title?: unknown })?.title;
      throw new ReaderDataError(`书影音数据 ${source} 中的条目字段不合法：${typeof title === "string" && title.trim() !== "" ? title : "（无标题）"}`);
    }
  }
  return { entries: entries as ShelfPublicEntry[] };
}

class HttpStatusError extends ReaderDataError {
  constructor(
    url: string,
    readonly status: number,
  ) {
    super(`读取 ${url} 失败：${status}`);
  }
}

async function getJson(fetchImpl: typeof fetch, url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    throw new ReaderDataError(`读取 ${url} 失败：${(error as Error).name}`);
  }
  if (!response.ok) throw new HttpStatusError(url, response.status);
  try {
    return await response.json();
  } catch {
    throw new ReaderDataError(`读取 ${url} 失败：返回非 JSON`);
  }
}

async function mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// 翻完公开列表取全部 slug，再逐篇取正文（列表不含 body）
async function fromApi(origin: string, fetchImpl: typeof fetch): Promise<ReaderData> {
  const base = origin.replace(/\/+$/, "");
  const slugs: string[] = [];
  for (let page = 1; ; page++) {
    const list = (await getJson(fetchImpl, `${base}/api/posts?page=${page}`)) as { items: { slug: string }[]; total: number; pageSize: number };
    slugs.push(...list.items.map((item) => item.slug));
    if (page * list.pageSize >= list.total || list.items.length === 0) break;
  }
  const posts = await mapLimit(slugs, DETAIL_CONCURRENCY, (slug) => getJson(fetchImpl, `${base}/api/posts/${encodeURIComponent(slug)}`));
  return parseReaderData({ posts }, base);
}

async function fromFixture(name: string, readFixture: (name: string) => Promise<string>): Promise<ReaderData> {
  let text: string;
  try {
    text = await readFixture(name);
  } catch {
    throw new ReaderDataError(`读者夹具 ${name} 不存在（tests/fixtures/reader/${name}.json）`);
  }
  return parseReaderData(JSON.parse(text), name);
}

const readFixtureFile = (name: string) => readFile(fileURLToPath(new URL(`${name}.json`, FIXTURE_DIR)), "utf8");

export async function loadReaderData(options: LoadOptions): Promise<ReaderData> {
  const { fixture, apiOrigin, bootstrap = false, dev = false, fetch: fetchImpl = fetch, readFixture = readFixtureFile, warn = console.warn } = options;
  if (fixture) return fromFixture(fixture, readFixture);
  if (apiOrigin) {
    try {
      return await fromApi(apiOrigin, fetchImpl);
    } catch (error) {
      if (!bootstrap) throw error;
      warn(`READER_BOOTSTRAP：${(error as Error).message}，以 0 篇文章构建`);
      return { posts: [] };
    }
  }
  if (dev) return fromFixture(DEFAULT_FIXTURE, readFixture);
  if (bootstrap) return { posts: [] };
  throw new ReaderDataError("未配置 READER_API_ORIGIN（或 READER_FIXTURE），无法构建读者页");
}

async function shelfFromApi(origin: string, fetchImpl: typeof fetch, warn: (message: string) => void): Promise<ShelfData> {
  const url = `${origin.replace(/\/+$/, "")}/api/shelf`;
  let body: unknown;
  try {
    body = await getJson(fetchImpl, url);
  } catch (error) {
    // 首次部署书影音时线上 Worker 还没有该接口
    if (!(error instanceof HttpStatusError && error.status === 404)) throw error;
    warn(`${url} 返回 404，书影音以 0 条构建`);
    return { entries: [] };
  }
  return parseShelfData({ entries: (body as { items?: unknown })?.items }, url);
}

// 夹具 {name}.shelf.json 不存在 → 空（现有夹具无需改动）
async function shelfFromFixture(name: string, readFixture: (name: string) => Promise<string>): Promise<ShelfData> {
  let text: string;
  try {
    text = await readFixture(`${name}.shelf`);
  } catch {
    return { entries: [] };
  }
  return parseShelfData(JSON.parse(text), `${name}.shelf`);
}

export async function loadShelfData(options: LoadOptions): Promise<ShelfData> {
  const { fixture, apiOrigin, bootstrap = false, dev = false, fetch: fetchImpl = fetch, readFixture = readFixtureFile, warn = console.warn } = options;
  if (fixture) return shelfFromFixture(fixture, readFixture);
  if (apiOrigin) {
    try {
      return await shelfFromApi(apiOrigin, fetchImpl, warn);
    } catch (error) {
      if (!bootstrap) throw error;
      warn(`READER_BOOTSTRAP：${(error as Error).message}，书影音以 0 条构建`);
      return { entries: [] };
    }
  }
  if (dev) return shelfFromFixture(DEFAULT_FIXTURE, readFixture);
  if (bootstrap) return { entries: [] };
  throw new ReaderDataError("未配置 READER_API_ORIGIN（或 READER_FIXTURE），无法构建读者页");
}

export function readerData(): Plugin {
  let dev = false;
  let pending: Promise<ReaderData> | undefined;
  let pendingShelf: Promise<ShelfData> | undefined;
  const options = (): LoadOptions => ({
    fixture: process.env.READER_FIXTURE || undefined,
    apiOrigin: process.env.READER_API_ORIGIN || undefined,
    bootstrap: process.env.READER_BOOTSTRAP === "1",
    dev,
  });
  return {
    name: "reader-data",
    configResolved(config) {
      dev = config.command === "serve";
    },
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return id === SHELF_VIRTUAL_ID ? SHELF_RESOLVED_ID : undefined;
    },
    async load(id) {
      // 同一构建进程只取一次（多个环境 / 页面共享）
      if (id === RESOLVED_ID) {
        pending ??= loadReaderData(options());
        return `export default ${JSON.stringify(await pending)};`;
      }
      if (id === SHELF_RESOLVED_ID) {
        pendingShelf ??= loadShelfData(options());
        return `export default ${JSON.stringify(await pendingShelf)};`;
      }
      return undefined;
    },
  };
}
