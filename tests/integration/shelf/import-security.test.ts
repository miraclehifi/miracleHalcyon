import type { APIContext } from "astro";
import { beforeEach, describe, expect, it } from "vitest";
import { createAuthMiddleware } from "../../../src/middleware";
import { entryCount, fakeDouban, FIXTURES, makeImport, req, resetShelf, UID } from "./import-fixtures";
import { NOW, SITE } from "./shelf-fixtures";

// 导入接口的输入校验、豆瓣错误映射、鉴权、外发请求范围（TC-US04-10–13）
beforeEach(resetShelf);

const WHITELIST = (url: string) => {
  const host = new URL(url).hostname;
  return host === "m.douban.com" || host.endsWith(".doubanio.com");
};

describe("参数校验", () => {
  // [TC-US04-10][SC-IMPORT-20] 400 时不发任何外部请求
  it("非法 uid 与参数 → 400 VALIDATION_FAILED", async () => {
    const { fetchImpl, requests } = fakeDouban();
    const api = makeImport(fetchImpl);
    const cases: Record<string, unknown>[] = [
      { uid: "a".repeat(65) }, { uid: "" }, { uid: "../user/1" }, { uid: "a/b" }, { uid: "a?b" }, { uid: "a#b" }, { uid: "a%2Fb" }, { uid: "张三" }, { uid: "a b" },
      { kind: "music" }, { status: "mark" }, { start: -1 }, { start: 1.5 }, { start: 10 }, { start: 100_020 }, { start: "x" }, { mode: undefined }, { mode: "all" },
      { start: 20, head: "2026/10/18" }, { start: 20 }, { types: ["book"] }, { types: [] }, { types: ["music"] }, { types: ["movie", "movie"] },
    ];
    const results = [];
    for (const extra of cases) {
      const res = await api.page(req(extra));
      results.push([res.status, res.body?.error.code]);
    }
    const badJson = await api.page("{not json");
    expect(results.every(([status, code]) => status === 400 && code === "VALIDATION_FAILED")).toBe(true);
    expect([badJson.status, badJson.body?.error.code, requests.length, await entryCount()]).toEqual([400, "BAD_REQUEST", 0, 0]);
  });

  it("合法 uid 边界：长度 64、a_b.c-d", async () => {
    const { fetchImpl, lists } = fakeDouban();
    const api = makeImport(fetchImpl);
    const statuses = [(await api.page(req({ uid: "a".repeat(64) }))).status, (await api.page(req({ uid: "a_b.c-d" }))).status];
    expect([statuses, lists().map((r) => new URL(r.url).pathname)]).toEqual([[200, 200], [`/rexxar/api/v2/user/${"a".repeat(64)}/interests`, "/rexxar/api/v2/user/a_b.c-d/interests"]]);
  });
});

describe("豆瓣错误映射", () => {
  // [TC-US04-11][SC-IMPORT-17][SC-IMPORT-18][SC-IMPORT-19] 均不写入条目
  it.each([
    ["404", () => new Response(JSON.stringify({ msg: "traversal_error", code: 404 }), { status: 404 }), 404, "DOUBAN_USER_NOT_FOUND"],
    ["403", () => new Response("forbidden", { status: 403 }), 403, "DOUBAN_FORBIDDEN"],
    ["要求登录", () => new Response(JSON.stringify({ msg: "need_login", code: 1000 }), { status: 400 }), 403, "DOUBAN_FORBIDDEN"],
    ["500", () => new Response("err", { status: 500 }), 502, "FETCH_FAILED"],
    ["302", () => new Response(null, { status: 302, headers: { Location: "https://accounts.douban.com/" } }), 502, "FETCH_FAILED"],
    ["非 JSON", () => new Response("<html>"), 502, "FETCH_FAILED"],
    ["网络错误", () => Promise.reject(new TypeError("network")), 502, "FETCH_FAILED"],
  ])("%s → %d %s", async (_, list, status, code) => {
    const { fetchImpl } = fakeDouban({}, { [`https://m.douban.com/rexxar/api/v2/user/`]: list });
    const res = await makeImport(fetchImpl).page(req());
    expect([res.status, res.body?.error.code, typeof res.body?.error.message, await entryCount()]).toEqual([status, code, "string", 0]);
  });

  it("列表超时 → 502 FETCH_FAILED", async () => {
    const hang = (_: URL, init?: RequestInit) => new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    const { fetchImpl } = fakeDouban({}, { [`https://m.douban.com/rexxar/api/v2/user/`]: hang });
    const res = await makeImport(fetchImpl, { importTimeoutMs: 50 }).page(req());
    expect([res.status, res.body?.error.code, res.body?.error.message]).toEqual([502, "FETCH_FAILED", "豆瓣暂时无法访问，已导入的条目已保存，可稍后重新导入"]);
  });
});

describe("外发请求范围与数量", () => {
  // [TC-US04-13][TC-US04-10][SC-IMPORT-19] 书 20 本（全部需 tags + 封面）：外部请求 ≤ 41，全部白名单主机且 redirect: manual
  it("单页 ≤ 41 个外部请求", async () => {
    const { fetchImpl, requests } = fakeDouban({ "book·done·0": FIXTURES.bookDoneManga });
    const res = await makeImport(fetchImpl).page(req({ kind: "book", types: ["book", "comic"] }));
    expect([res.body?.created, requests.length <= 41, requests.every((r) => WHITELIST(r.url) && r.redirect === "manual")]).toEqual([20, true, true]);
    expect(requests[0].url).toBe(`https://m.douban.com/rexxar/api/v2/user/${UID}/interests?type=book&status=done&start=0&count=20`);
  });

  // 超时发生在单项处理中：已写入的保留，其余进 failed（FETCH_FAILED），整页仍 200
  it("单项处理超时", async () => {
    const slowCover = (_: URL, init?: RequestInit) => new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
    const page = structuredClone(FIXTURES.movieDoneP2);
    const { fetchImpl } = fakeDouban({ "movie·done·20": page }, { [page.interests[0].subject.cover_url]: slowCover });
    const res = await makeImport(fetchImpl, { importTimeoutMs: 200 }).page(req({ start: 20, head: "2026-10-18 08:25:08" }));
    expect([res.status, res.body?.created, res.body?.failed]).toEqual([200, 2, [{ doubanId: page.interests[0].subject.id, title: page.interests[0].subject.title, reason: "FETCH_FAILED" }]]);
    expect(await entryCount()).toBe(2);
  });
});

describe("鉴权", () => {
  // [TC-US04-12][SC-IMPORT-21] 无会话 401；写接口跨站 403；有效会话 + 本站放行
  it("导入、状态、结束", async () => {
    const paths: [string, string][] = [["POST", "/api/admin/shelf/import"], ["POST", "/api/admin/shelf/import/finish"], ["GET", "/api/admin/shelf/import/state"]];
    const through = async (method: string, path: string, origin: string, session: boolean) => {
      let reached = false;
      const middleware = createAuthMiddleware({ getSession: async () => (session ? ({ token: "t" } as never) : null), siteOrigin: SITE, now: () => NOW });
      const request = new Request(`${SITE}${path}`, { method, headers: { Origin: origin } });
      const context = { request, url: new URL(request.url), cookies: { get: () => ({ value: "t" }) }, locals: {} } as unknown as APIContext;
      const response = (await middleware(context, async () => {
        reached = true;
        return new Response(null, { status: 200 });
      })) as Response;
      return { status: response.status, reached };
    };
    const results = [];
    for (const [method, path] of paths) {
      results.push([
        (await through(method, path, SITE, false)).status,
        method === "GET" ? "-" : (await through(method, path, "https://evil.example", true)).status,
        (await through(method, path, SITE, true)).reached,
      ]);
    }
    expect(results).toEqual([[401, 403, true], [401, 403, true], [401, "-", true]]);
  });
});
