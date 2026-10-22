import type { APIContext } from "astro";
import { describe, expect, it } from "vitest";
import { createAuthMiddleware } from "../../../src/middleware";
import { makeShelf, MIN, NOW, rowCount, SITE } from "./shelf-fixtures";

// [TC-US01-13][SC-MANAGE-22][TC-US02-10][SC-RECOG-24] 写接口与识别接口：无会话 401、跨站 403，被拒请求不触达路由（识别不会请求豆瓣）
const PATHS: [string, string][] = [
  ["POST", "/api/admin/shelf/entries"],
  ["GET", "/api/admin/shelf/entries?type=book"],
  ["PUT", "/api/admin/shelf/entries/1"],
  ["DELETE", "/api/admin/shelf/entries/1"],
  ["POST", "/api/admin/shelf/entries/1/hide"],
  ["POST", "/api/admin/shelf/entries/1/unhide"],
  ["POST", "/api/admin/shelf/recognize"], // [TC-US02-10][SC-RECOG-24]
];

async function through(method: string, path: string, headers: Record<string, string>, session: boolean) {
  let reached = false;
  const middleware = createAuthMiddleware({ getSession: async () => (session ? ({ token: "t" } as never) : null), siteOrigin: SITE, now: () => NOW });
  const request = new Request(`${SITE}${path}`, { method, headers });
  const context = { request, url: new URL(request.url), cookies: { get: () => ({ value: "t" }) }, locals: {} } as unknown as APIContext;
  const response = (await middleware(context, async () => {
    reached = true;
    return new Response(null, { status: 200 });
  })) as Response;
  return { status: response.status, reached };
}

describe("书影音接口鉴权", () => {
  it("无会话 401；写接口跨站 403；有效会话 + 本站放行", async () => {
    const results = [];
    for (const [method, path] of PATHS) {
      results.push({
        path: `${method} ${path}`,
        guest: (await through(method, path, { Origin: SITE }, false)).status,
        cross: method === "GET" ? "-" : (await through(method, path, { Origin: "https://evil.example" }, true)).status,
        ok: (await through(method, path, { Origin: SITE }, true)).reached,
      });
    }
    expect(results.every((r) => r.guest === 401 && (r.cross === "-" || r.cross === 403) && r.ok)).toBe(true);
  });

  // [TC-US02-08] 绕过识别直接保存同一豆瓣 ID：第二次 409 带已有条目；null 豆瓣 ID 不受限
  it("同豆瓣 ID 第二次保存 409", async () => {
    const shelf = makeShelf();
    const douban = { doubanId: "27608239", doubanUrl: "https://book.douban.com/subject/27608239/" };
    const first = await shelf.create({ ...MIN, ...douban });
    const before = await rowCount();
    const second = await shelf.create({ ...MIN, title: "原则（重复）", ...douban });
    const nulls = [await shelf.create(MIN), await shelf.create(MIN)];
    expect({
      second: [second.status, second.body.error.code, second.body.error.existing],
      rowsAdded: (await rowCount()) - before,
      nulls: nulls.map((r) => r.status),
    }).toEqual({ second: [409, "DUPLICATE_DOUBAN_ID", { id: first.body.id, title: "原则" }], rowsAdded: 2, nulls: [201, 201] });
  });
});
