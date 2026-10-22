import type { APIContext } from "astro";
import { describe, expect, it } from "vitest";
import doubanBookTags from "../../fixtures/douban/book-principles-tags.json";
import bookPrinciples from "../../fixtures/douban/book-principles.json";
import gameBoard from "../../fixtures/douban/game-board.json";
import movieShawshank from "../../fixtures/douban/movie-shawshank.json";
import noTitle from "../../fixtures/douban/no-title.json";
import tvDispatch from "../../fixtures/douban/tv-dispatch.json";
import { createRecognizeHandler } from "../../../src/pages/api/admin/shelf/recognize";
import { JPG, makeShelf, MIN, SITE } from "./shelf-fixtures";

// POST /api/admin/shelf/recognize（shelf api-contract §3）：fetch 按 URL 返回 tests/fixtures/douban 夹具，并记录全部外发请求
const REXXAR = "https://m.douban.com/rexxar/api/v2/";
type Route = (url: URL) => Response | Promise<Response>;

function fakeFetch(overrides: Record<string, Route> = {}) {
  const hosts: string[] = [];
  const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  const routes: Record<string, Route> = {
    [`${REXXAR}book/27608239`]: () => json(bookPrinciples),
    [`${REXXAR}book/27608239/tags`]: () => json(doubanBookTags),
    [`${REXXAR}movie/37501131`]: () => json(tvDispatch),
    [`${REXXAR}movie/1292052`]: () => json(movieShawshank),
    [`${REXXAR}game/10757298`]: () => json(gameBoard),
    ...overrides,
  };
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    hosts.push(url.hostname);
    if (init?.redirect !== "manual") throw new Error("必须 redirect: manual");
    const route = routes[url.href] ?? (url.hostname.endsWith(".doubanio.com") ? () => new Response(JPG) : () => new Response("not found", { status: 404 }));
    return route(url);
  }) as typeof fetch;
  return { fetchImpl, hosts };
}

async function recognize(body: unknown, fetchImpl: typeof fetch, timeoutMs?: number) {
  const handler = createRecognizeHandler({ db: (await import("cloudflare:workers")).env.DB, bucket: (await import("cloudflare:workers")).env.MEDIA, fetch: fetchImpl, recognizeTimeoutMs: timeoutMs });
  const request = new Request(`${SITE}/api/admin/shelf/recognize`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  const response = await handler({ request, url: new URL(request.url), params: {}, locals: {} } as unknown as APIContext);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 断言里按多种响应形状取字段
  return { status: response.status, body: (await response.json()) as Record<string, any> };
}

const WHITELIST = (host: string) => host === "m.douban.com" || host.endsWith(".doubanio.com");

describe("识别接口", () => {
  // [TC-US02-01][SC-RECOG-03] 字段逐项；不返回状态、评分、日期、短评
  it("书条目链接", async () => {
    const { fetchImpl, hosts } = fakeFetch();
    const res = await recognize({ text: "https://book.douban.com/subject/27608239/?from=share" }, fetchImpl);
    expect(res).toEqual({
      status: 200,
      body: {
        fields: {
          type: "book", title: "原则", creator: "瑞·达利欧", year: 2018,
          coverData: expect.stringMatching(/^data:image\/jpeg;base64,/),
          doubanUrl: "https://book.douban.com/subject/27608239/", doubanId: "27608239",
        },
        missing: [],
      },
    });
    expect(hosts.every(WHITELIST)).toBe(true);
  });

  // [TC-US02-02][SC-RECOG-05] 作者提供的真实 App 分享链接 → 剧
  it("App 分享链接", async () => {
    const { fetchImpl, hosts } = fakeFetch();
    const res = await recognize({ text: "https://www.douban.com/doubanapp/dispatch/movie/37501131" }, fetchImpl);
    expect([res.status, res.body.fields.type, res.body.fields.title, res.body.fields.doubanUrl]).toEqual([200, "series", "现在不是出轨的问题", "https://movie.douban.com/subject/37501131/"]);
    expect(hosts).toEqual(["m.douban.com", "img3.doubanio.com"]);
  });

  // [TC-US02-03][SC-RECOG-11] 桌游
  it("桌游", async () => {
    const { fetchImpl } = fakeFetch();
    expect((await recognize({ text: "https://www.douban.com/game/10757298/" }, fetchImpl)).body.fields.type).toBe("boardgame");
  });

  // [TC-US02-05][SC-RECOG-13] 非豆瓣 / 非条目 / 请求格式；均不外发请求
  it("链接错误与输入校验", async () => {
    const { fetchImpl, hosts } = fakeFetch();
    const cases = [
      await recognize({ text: "https://example.com/book/1" }, fetchImpl),
      await recognize({ text: "一段没有链接的文字" }, fetchImpl),
      await recognize({ text: "https://www.douban.com/doulist/123/" }, fetchImpl),
      await recognize({ text: "" }, fetchImpl),
      await recognize({}, fetchImpl),
      await recognize({ text: "x".repeat(10001) }, fetchImpl),
      await recognize("{not json", fetchImpl),
    ];
    expect(cases.map((r) => [r.status, r.body.error.code])).toEqual([
      [422, "NOT_DOUBAN_LINK"], [422, "NOT_DOUBAN_LINK"], [422, "NOT_SUBJECT_LINK"],
      [400, "VALIDATION_FAILED"], [400, "VALIDATION_FAILED"], [400, "VALIDATION_FAILED"], [400, "BAD_REQUEST"],
    ]);
    expect(cases[0].body.error.message).toBe("不是豆瓣链接");
    expect(hosts).toEqual([]);
  });

  // [TC-US02-06][TC-US02-07][SC-RECOG-14][SC-RECOG-15] 豆瓣失败与解析失败
  it("豆瓣请求失败与解析失败", async () => {
    const statuses = [404, 418, 500];
    const failed = [];
    for (const status of statuses) {
      const { fetchImpl } = fakeFetch({ [`${REXXAR}movie/1292052`]: () => new Response("x", { status }) });
      failed.push(await recognize({ text: "https://movie.douban.com/subject/1292052/" }, fetchImpl));
    }
    const network = fakeFetch({ [`${REXXAR}movie/1292052`]: () => Promise.reject(new TypeError("network")) });
    const html = fakeFetch({ [`${REXXAR}movie/1292052`]: () => new Response("<html>验证</html>") });
    const empty = fakeFetch({ [`${REXXAR}movie/1292052`]: () => new Response(JSON.stringify(noTitle)) });
    const others = [
      await recognize({ text: "https://movie.douban.com/subject/1292052/" }, network.fetchImpl),
      await recognize({ text: "https://movie.douban.com/subject/1292052/" }, html.fetchImpl),
      await recognize({ text: "https://movie.douban.com/subject/1292052/" }, empty.fetchImpl),
    ];
    expect([...failed, ...others].map((r) => [r.status, r.body.error.code])).toEqual([
      [422, "FETCH_FAILED"], [422, "FETCH_FAILED"], [422, "FETCH_FAILED"], [422, "FETCH_FAILED"], [422, "PARSE_FAILED"], [422, "PARSE_FAILED"],
    ]);
    expect(others[1].body.error.message).toBe("解析不出条目信息");
  });

  // [TC-US02-08][SC-RECOG-18][SC-RECOG-19] 重复：不请求豆瓣；excludeId 为自身时正常；隐藏条目也算
  it("按豆瓣条目 ID 去重", async () => {
    const shelf = makeShelf();
    const x = (await shelf.create({ ...MIN, doubanId: "27608239", doubanUrl: "https://book.douban.com/subject/27608239/" })).body;
    await shelf.hide(x.id);
    const dup = fakeFetch();
    const res = await recognize({ text: "https://book.douban.com/subject/27608239/" }, dup.fetchImpl);
    const self = await recognize({ text: "https://book.douban.com/subject/27608239/", excludeId: x.id }, fakeFetch().fetchImpl);
    expect({ res: res.body, hosts: dup.hosts, self: self.body.fields?.title }).toEqual({
      res: { duplicate: { id: x.id, title: "原则", type: "book", status: "completed", markedOn: "2026-10-01" } },
      hosts: [],
      self: "原则",
    });
  });

  // [TC-US02-09][SC-RECOG-23] 不跟随跳转、封面只限豆瓣图片域
  it("SSRF", async () => {
    const redirect = fakeFetch({ [`${REXXAR}movie/1292052`]: () => new Response(null, { status: 302, headers: { Location: "https://evil.example/" } }) });
    const r1 = await recognize({ text: "https://movie.douban.com/subject/1292052/" }, redirect.fetchImpl);
    const offsite = fakeFetch({ [`${REXXAR}movie/1292052`]: () => new Response(JSON.stringify({ ...movieShawshank, cover_url: "https://evil.example/a.jpg", pic: null })) });
    const r2 = await recognize({ text: "https://movie.douban.com/subject/1292052/" }, offsite.fetchImpl);
    expect({
      redirect: [r1.status, r1.body.error.code, redirect.hosts.includes("evil.example")],
      offsite: [r2.body.fields.coverData, r2.body.missing, offsite.hosts.includes("evil.example")],
    }).toEqual({ redirect: [422, "FETCH_FAILED", false], offsite: [null, ["cover"], false] });
  });

  // [TC-US02-12][SC-RECOG-21] 封面异常：svg、超过 5 MiB、5 MiB 整
  it("封面异常降级", async () => {
    const cover = (body: BodyInit) => fakeFetch({ "https://img3.doubanio.com/view/photo/m_ratio_poster/public/p2934829882.jpg": () => new Response(body) }).fetchImpl;
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(JPG);
    const edge = new Uint8Array(5 * 1024 * 1024);
    edge.set(JPG);
    const results = [];
    for (const body of [new TextEncoder().encode("<svg/>"), big, edge]) results.push(await recognize({ text: "https://movie.douban.com/subject/1292052/" }, cover(body)));
    expect(results.map((r) => [r.status, r.body.fields.coverData === null, r.body.missing])).toEqual([[200, true, ["cover"]], [200, true, ["cover"]], [200, false, []]]);
  });

  // [TC-US02-13] 总时限：条目挂起 → FETCH_FAILED（测试用 200ms 时限代替 8s）
  it("超时", async () => {
    const hang = fakeFetch({ [`${REXXAR}movie/1292052`]: () => new Promise<Response>(() => {}) });
    const started = Date.now();
    const res = await recognize({ text: "https://movie.douban.com/subject/1292052/" }, hang.fetchImpl, 200);
    expect([res.status, res.body.error.code, Date.now() - started < 2000]).toEqual([422, "FETCH_FAILED", true]);
  });
});
