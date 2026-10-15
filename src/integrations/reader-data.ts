// 读者页构建数据（ADR-007、reader module-spec §1.2）：Vite 插件在 Node 中取数，
// 以虚拟模块 virtual:reader-data 注入预渲染页面；预渲染（workerd）中不再 fetch
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { sortPublished } from "../lib/reader/sort";
import type { ReaderData, ReaderPost } from "../lib/reader/types";

const VIRTUAL_ID = "virtual:reader-data";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
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

async function getJson(fetchImpl: typeof fetch, url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (error) {
    throw new ReaderDataError(`读取 ${url} 失败：${(error as Error).name}`);
  }
  if (!response.ok) throw new ReaderDataError(`读取 ${url} 失败：${response.status}`);
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

export function readerData(): Plugin {
  let dev = false;
  let pending: Promise<ReaderData> | undefined;
  return {
    name: "reader-data",
    configResolved(config) {
      dev = config.command === "serve";
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    async load(id) {
      if (id !== RESOLVED_ID) return undefined;
      // 同一构建进程只取一次（多个环境 / 页面共享）
      pending ??= loadReaderData({
        fixture: process.env.READER_FIXTURE || undefined,
        apiOrigin: process.env.READER_API_ORIGIN || undefined,
        bootstrap: process.env.READER_BOOTSTRAP === "1",
        dev,
      });
      return `export default ${JSON.stringify(await pending)};`;
    },
  };
}
