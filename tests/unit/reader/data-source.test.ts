import { describe, expect, it, vi } from "vitest";
import { loadReaderData, ReaderDataError } from "../../../src/integrations/reader-data";
import type { ReaderPost } from "../../../src/lib/reader/types";

const post = (slug: string, publishedAt: string, extra: Partial<ReaderPost> = {}): ReaderPost => ({
  slug,
  title: slug,
  summary: "",
  tags: [],
  publishedAt,
  lastPublishedAt: `${publishedAt}T08:00:00.000Z`,
  body: `正文 ${slug}`,
  cover: null,
  ...extra,
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

// 41 篇：3 页列表 + 逐篇详情
function fakeApi(total = 41, failPage?: number) {
  const all = Array.from({ length: total }, (_, i) => post(`p-${String(i).padStart(2, "0")}`, `2026-09-${String((i % 28) + 1).padStart(2, "0")}`));
  return vi.fn(async (input: string | URL) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/posts") {
      const page = Number(url.searchParams.get("page") ?? "1");
      if (page === failPage) return new Response("boom", { status: 500 });
      const items = all.slice((page - 1) * 20, page * 20).map(({ body: _body, ...summary }) => summary);
      return json({ items, page, pageSize: 20, total });
    }
    const slug = decodeURIComponent(url.pathname.replace("/api/posts/", ""));
    const found = all.find((p) => p.slug === slug);
    return found ? json(found) : json({ error: { code: "POST_NOT_FOUND" } }, 404);
  });
}

// READER-UT-09（SC-REBUILD-07、SC-REBUILD-08）
describe("loadReaderData", () => {
  it("线上接口：翻完全部列表页再逐篇取正文，按发布日期倒序输出", async () => {
    const fetch = fakeApi();
    const data = await loadReaderData({ apiOrigin: "https://halcyon.example.com", fetch });
    expect(data.posts).toHaveLength(41);
    expect(data.posts.every((p) => p.body.startsWith("正文"))).toBe(true);
    const dates = data.posts.map((p) => p.publishedAt);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(fetch.mock.calls.filter(([u]) => new URL(String(u)).pathname === "/api/posts")).toHaveLength(3);
  });

  it("[TC-US03-08] 接口返回 500 时报错，信息含地址与状态", async () => {
    const error = await loadReaderData({ apiOrigin: "https://halcyon.example.com", fetch: fakeApi(41, 2) }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ReaderDataError);
    expect(String((error as Error).message)).toMatch(/https:\/\/halcyon\.example\.com\/api\/posts\?page=2.*500/);
  });

  it("接口返回非 JSON 时报错", async () => {
    const fetch = vi.fn(async () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }));
    await expect(loadReaderData({ apiOrigin: "https://x.example", fetch })).rejects.toThrow(/非 JSON/);
  });

  it("READER_BOOTSTRAP：接口不可达时以 0 篇文章构建并警告；未开启时报错", async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const warn = vi.fn();
    await expect(loadReaderData({ apiOrigin: "https://x.example", bootstrap: true, fetch, warn })).resolves.toEqual({ posts: [] });
    expect(warn).toHaveBeenCalledOnce();
    await expect(loadReaderData({ apiOrigin: "https://x.example", fetch })).rejects.toThrow(/TypeError/);
  });

  it("夹具：按名读取；夹具不存在时报错含名称；字段不合法时报错含 slug", async () => {
    const readFixture = vi.fn(async (name: string) => {
      if (name === "ok") return JSON.stringify({ posts: [post("b", "2026-10-01"), post("a", "2026-10-02")] });
      if (name === "bad") return JSON.stringify({ posts: [{ ...post("bad-one", "2026-10-01"), publishedAt: "10/01" }] });
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
    expect((await loadReaderData({ fixture: "ok", readFixture })).posts.map((p) => p.slug)).toEqual(["a", "b"]);
    await expect(loadReaderData({ fixture: "nope", readFixture })).rejects.toThrow(/nope/);
    await expect(loadReaderData({ fixture: "bad", readFixture })).rejects.toThrow(/bad-one/);
  });

  it("都未配置：dev 用默认夹具；构建时报错", async () => {
    const readFixture = vi.fn(async () => JSON.stringify({ posts: [] }));
    await expect(loadReaderData({ dev: true, readFixture })).resolves.toEqual({ posts: [] });
    expect(readFixture).toHaveBeenCalledWith("reader-fixture");
    await expect(loadReaderData({ readFixture })).rejects.toThrow(/READER_API_ORIGIN/);
  });
});
