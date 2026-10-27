import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createPublicShelfHandler } from "../../../src/pages/api/shelf";
import { JPG, makeShelf, objectExists, rowCount, SITE } from "./shelf-fixtures";

// 游戏条目：平台与 IGDB 封面（ADR-013；TC-US01-26–28）。igdbStub 按图片 ID 返回图片头，记录全部外发请求
const IGDB = "https://images.igdb.com/igdb/image/upload/";
const T1080 = (id: string) => `${IGDB}t_1080p/${id}.jpg`;

// 最小 JPEG 头：SOI + SOF0（高在前、宽在后）
const jpegHead = (w: number, h: number) => new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0, 17, 8, h >> 8, h & 0xff, w >> 8, w & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0, 0, 0]);

function igdbStub() {
  const requests: string[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    requests.push(url.href);
    if (init?.redirect !== "manual") throw new Error("必须 redirect: manual");
    if (url.hostname !== "images.igdb.com") return new Response(jpegHead(1, 1));
    const id = /\/([a-z0-9]+)\.jpg$/.exec(url.pathname)?.[1];
    if (id === "co8h3y") return new Response(jpegHead(810, 1080));
    if (id === "co5vmg") return new Response(jpegHead(811, 1080));
    if (id === "co3xx01") return new Response(null, { status: 302, headers: { Location: "https://evil.example/a.jpg" } });
    if (id === "coslow1") return new Promise<Response>(() => {});
    if (id === "cosvg01") return new Response("<svg xmlns='http://www.w3.org/2000/svg'/>");
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { fetchImpl, requests };
}

const stub = igdbStub();
const shelf = makeShelf({ fetch: stub.fetchImpl, igdbTimeoutMs: 200 });
const GAME = { type: "game", title: "塞尔达传说", status: "completed", markedOn: "2026-05-01", platform: "ps5" };

async function getPublic() {
  const request = new Request(`${SITE}/api/shelf`);
  const response = await createPublicShelfHandler({ db: env.DB, bucket: env.MEDIA })({ request, url: new URL(request.url), params: {}, locals: {} } as unknown as APIContext);
  return response.json<{ items: Record<string, unknown>[] }>();
}

describe("游戏条目接口", () => {
  // [TC-US01-26][SC-MANAGE-23] #1–3、#6：规范化、读取宽高、无封面；非游戏忽略平台与链接；读回与公开列表
  it("新增游戏与非游戏", async () => {
    const hooksBefore = shelf.hookCalls.n;
    const a = await shelf.create({ ...GAME, coverUrl: `${IGDB}t_cover_big/co8h3y.webp` });
    const b = await shelf.create({ ...GAME, title: "B", coverUrl: `${IGDB}t_720p/co5vmg.png` });
    const c = await shelf.create({ ...GAME, title: "C", coverUrl: null });
    const requestsBefore = stub.requests.length;
    const book = await shelf.create({ type: "book", title: "书", status: "completed", markedOn: "2026-05-01", platform: "ps5", coverUrl: T1080("co8h3y") });
    const read = await shelf.get(a.body.id);
    const pub = (await getPublic()).items.find((e) => e.title === "塞尔达传说");
    const pick = (e: Record<string, unknown>) => [e.platform, e.coverUrl, e.coverWidth, e.coverHeight, e.cover];
    expect({
      status: [a.status, b.status, c.status, book.status],
      a: pick(a.body),
      b: pick(b.body),
      c: pick(c.body),
      book: pick(book.body),
      bookRequests: stub.requests.length - requestsBefore,
      hooks: shelf.hookCalls.n - hooksBefore,
      read: pick(read.body),
      pub: [pub?.platform, pub?.cover, pub?.coverWidth, pub?.coverHeight, "coverUrl" in (pub ?? {})],
    }).toEqual({
      status: [201, 201, 201, 201],
      a: ["ps5", T1080("co8h3y"), 810, 1080, T1080("co8h3y")],
      b: ["ps5", T1080("co5vmg"), 811, 1080, T1080("co5vmg")],
      c: ["ps5", null, null, null, null],
      book: [null, null, null, null, null],
      bookRequests: 0,
      hooks: 4,
      read: ["ps5", T1080("co8h3y"), 810, 1080, T1080("co8h3y")],
      pub: ["ps5", T1080("co8h3y"), 810, 1080, false],
    });
  });

  // [TC-US01-26][SC-MANAGE-23] #4、#5、#7、#8：平台必填 / 合法；编辑链接不变不请求；游戏带上传封面 400
  it("平台校验、编辑不重复请求、拒绝上传封面", async () => {
    const noPlatform = { ...GAME, platform: undefined };
    const missing = await shelf.create(noPlatform);
    const xbox = await shelf.create({ ...GAME, platform: "xbox" });
    const upload = await shelf.create(GAME, JPG);
    const id = (await shelf.create({ ...GAME, title: "编辑", coverUrl: T1080("co8h3y") })).body.id;
    const before = stub.requests.length;
    const edited = await shelf.update(id, { ...GAME, title: "编辑后", coverUrl: `${IGDB}t_thumb/co8h3y.png` });
    const editUpload = await shelf.update(id, GAME, { cover: JPG });
    expect({
      missing: [missing.status, missing.body.error.fields],
      xbox: [xbox.status, xbox.body.error.fields],
      upload: [upload.status, upload.body.error.code],
      edited: [edited.status, edited.body.coverWidth, stub.requests.length - before],
      editUpload: [editUpload.status, editUpload.body.error.code],
    }).toEqual({
      missing: [400, ["platform"]],
      xbox: [400, ["platform"]],
      upload: [400, "BAD_REQUEST"],
      edited: [200, 810, 0],
      editUpload: [400, "BAD_REQUEST"],
    });
  });

  // [TC-US01-27][SC-MANAGE-24] 链接校验与防 SSRF：不合规 400 且不发请求；打不开 422 且不写库；只请求 images.igdb.com
  it("链接校验与防 SSRF", async () => {
    const rowsBefore = await rowCount();
    const before = stub.requests.length;
    const invalid = [
      "https://example.com/a.jpg",
      `https://images.igdb.com.evil.example/igdb/image/upload/t_1080p/co8h3y.jpg`,
      "https://user:pw@images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg",
      "https://images.igdb.com:8443/igdb/image/upload/t_1080p/co8h3y.jpg",
      `${IGDB}t_1080p/../co8h3y.jpg`,
      `${IGDB}t_1080p/CO8H3Y.jpg`,
      `${IGDB}t_1080p/co8h3y.gif`,
      `${T1080("co8h3y")}?${"a".repeat(2000)}`,
    ];
    const rejected = [];
    for (const coverUrl of invalid) {
      const res = await shelf.create({ ...GAME, coverUrl });
      rejected.push([res.status, res.body.error.fields]);
    }
    const invalidRequests = stub.requests.length - before;
    const http = await shelf.create({ ...GAME, title: "http", coverUrl: "http://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg" });
    const unreachable = [];
    for (const id of ["nope000", "co3xx01", "coslow1", "cosvg01"]) {
      const res = await shelf.create({ ...GAME, title: id, coverUrl: T1080(id) });
      unreachable.push([res.status, res.body.error.code, res.body.error.message]);
    }
    expect({
      rejected,
      invalidRequests,
      http: [http.status, http.body.coverUrl],
      unreachable,
      rows: (await rowCount()) - rowsBefore,
      hosts: [...new Set(stub.requests.map((u) => new URL(u).hostname))],
    }).toEqual({
      rejected: new Array(invalid.length).fill([400, ["coverUrl"]]),
      invalidRequests: 0,
      http: [201, T1080("co8h3y")],
      unreachable: new Array(4).fill([422, "COVER_LINK_UNREACHABLE", "封面链接打不开，请检查后重试"]),
      rows: 1,
      hosts: ["images.igdb.com"],
    });
  });

  // [TC-US01-28][SC-MANAGE-25] 切换分类时平台与封面
  it("切换分类", async () => {
    const book = await shelf.create({ type: "book", title: "书1", status: "completed", markedOn: "2026-05-01" }, JPG);
    const toGame = await shelf.update(book.body.id, { ...GAME, platform: "switch", coverUrl: null });
    const book2 = await shelf.create({ type: "book", title: "书2", status: "completed", markedOn: "2026-05-01" }, JPG);
    const toGameCover = await shelf.update(book2.body.id, { ...GAME, coverUrl: T1080("co8h3y") });
    const toBoard = await shelf.update(toGameCover.body.id, { ...GAME, type: "boardgame", platform: "switch", coverUrl: T1080("co8h3y") });
    const game = await shelf.create({ ...GAME, title: "游戏", coverUrl: T1080("co8h3y") });
    const noCover = await shelf.update(game.body.id, { ...GAME, title: "游戏", coverUrl: null });
    expect({
      toGame: [toGame.status, toGame.body.cover, toGame.body.platform, await objectExists(book.body.cover)],
      toGameCover: [toGameCover.status, toGameCover.body.coverUrl, await objectExists(book2.body.cover)],
      toBoard: [toBoard.status, toBoard.body.platform, toBoard.body.coverUrl, toBoard.body.coverWidth, toBoard.body.coverHeight],
      noCover: [noCover.status, noCover.body.cover, noCover.body.coverWidth, noCover.body.coverHeight],
    }).toEqual({
      toGame: [200, null, "switch", false],
      toGameCover: [200, T1080("co8h3y"), false],
      toBoard: [200, null, null, null, null],
      noCover: [200, null, null, null],
    });
  });
});
