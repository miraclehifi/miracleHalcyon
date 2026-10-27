import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { normalizeIgdbCoverUrl, platformIcon, platformLabel, readImageSize, SHELF_PLATFORMS } from "../../../src/domains/shelf/entry";
import { IgdbImageError } from "../../../src/domains/shelf/errors";
import { createIgdbImageClient, IGDB_HEAD_MAX } from "../../../src/domains/shelf/igdb";

const fixture = (name: string) => new Uint8Array(readFileSync(`tests/fixtures/igdb/${name}`));
const CANON = (id: string) => `https://images.igdb.com/igdb/image/upload/t_1080p/${id}.jpg`;

// SHELF-UT-12：IGDB 链接规范化（ADR-013 §2）
describe("normalizeIgdbCoverUrl", () => {
  // [TC-US01-26][SC-MANAGE-23] 任意尺寸、扩展名都改写为 t_1080p jpg；http 升级 https
  it.each([
    ["https://images.igdb.com/igdb/image/upload/t_cover_big/co8h3y.webp", "co8h3y"],
    ["https://images.igdb.com/igdb/image/upload/t_720p/co5vmg.png", "co5vmg"],
    ["http://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg", "co8h3y"],
    ["  https://images.igdb.com/igdb/image/upload/t_thumb/abc123.jpeg  ", "abc123"],
    ["https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg?v=1#x", "co8h3y"],
  ])("%s → 规范地址", (input, id) => {
    expect(normalizeIgdbCoverUrl(input)).toBe(CANON(id));
  });

  // [TC-US01-27][SC-MANAGE-24] 他站、相似主机、userinfo、端口、路径穿越、ID 含大写或 /、gif、超长、非字符串
  it.each([
    "https://example.com/a.jpg",
    "https://images.igdb.com.evil.example/igdb/image/upload/t_1080p/co8h3y.jpg",
    "https://user:pw@images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg",
    "https://images.igdb.com:8443/igdb/image/upload/t_1080p/co8h3y.jpg",
    "https://images.igdb.com/igdb/image/upload/x/../t_1080p/co8h3y.jpg",
    "https://images.igdb.com/igdb/image/upload/t_1080p/../co8h3y.jpg",
    "https://images.igdb.com/igdb/image/upload\\t_1080p\\co8h3y.jpg",
    "https://images.igdb.com/igdb/image/upload/t_1080p/CO8H3Y.jpg",
    "https://images.igdb.com/igdb/image/upload/t_1080p/co8/h3y.jpg",
    "https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.gif",
    "ftp://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg",
    "images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg",
    `https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg?${"a".repeat(2000)}`,
    "",
  ])("%s → null", (input) => {
    expect(normalizeIgdbCoverUrl(input)).toBeNull();
  });

  it("非字符串 → null", () => {
    expect([normalizeIgdbCoverUrl(null), normalizeIgdbCoverUrl(42)]).toEqual([null, null]);
  });
});

// SHELF-UT-13：由文件头读取宽高
describe("readImageSize", () => {
  // [TC-US01-26][SC-MANAGE-23] jpg（EXIF 在 SOF 前）、渐进式 jpg、png、webp 三种块
  it.each([
    ["baseline-exif-810x1080.jpg", 810, 1080],
    ["progressive-811x1080.jpg", 811, 1080],
    ["ihdr-600x900.png", 600, 900],
    ["vp8-720x960.webp", 720, 960],
    ["vp8l-1000x1333.webp", 1000, 1333],
    ["vp8x-1200x1600.webp", 1200, 1600],
  ])("%s", (name, width, height) => {
    expect(readImageSize(fixture(name))).toEqual({ width, height });
  });

  // [TC-US01-27][SC-MANAGE-24] 截断、svg 文本、gif → null
  it("数据不足或格式不认", () => {
    const gif = new TextEncoder().encode("GIF89a\x10\x00\x10\x00");
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    const truncated = fixture("baseline-exif-810x1080.jpg").subarray(0, 20);
    expect([readImageSize(truncated), readImageSize(svg), readImageSize(gif), readImageSize(new Uint8Array())]).toEqual([null, null, null, null]);
  });
});

describe("平台", () => {
  it("顺序、显示名与图标", () => {
    expect(SHELF_PLATFORMS.map((p) => [p, platformLabel(p), platformIcon(p)])).toEqual([
      ["ps5", "PS5", "playstation"],
      ["ps4", "PS4", "playstation"],
      ["switch", "Switch", "nintendoswitch"],
      ["switch2", "Switch 2", "nintendoswitch"],
      ["steam", "Steam", "steam"],
    ]);
  });
});

// IgdbImageClient：只请求规范地址、不跟随跳转、读够文件头即停
describe("IgdbImageClient", () => {
  const stream = (bytes: Uint8Array, chunk = 16) => {
    let offset = 0;
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= bytes.length) return controller.close();
        controller.enqueue(bytes.slice(offset, offset + chunk));
        offset += chunk;
      },
      cancel,
    });
    return { body, cancel, read: () => offset };
  };

  // [TC-US01-26][SC-MANAGE-23] 成功：redirect manual，读到 SOF 即取消
  it("读取宽高", async () => {
    const s = stream(fixture("baseline-exif-810x1080.jpg"));
    const fetchImpl = vi.fn(async () => new Response(s.body, { status: 200 }));
    const size = await createIgdbImageClient(fetchImpl as never).readSize(CANON("co8h3y"), new AbortController().signal);
    expect({ size, init: (fetchImpl.mock.calls[0] as unknown[])[1], cancelled: s.cancel.mock.calls.length, partial: s.read() < 364 }).toEqual({
      size: { width: 810, height: 1080 },
      init: expect.objectContaining({ redirect: "manual" }),
      cancelled: 1,
      partial: true,
    });
  });

  // [TC-US01-27][SC-MANAGE-24] 非规范地址不发请求；3xx、404、网络错误、非图片 → IgdbImageError
  it("失败情形", async () => {
    const fetchImpl = vi.fn();
    const client = (response: () => Promise<Response>) => createIgdbImageClient(vi.fn(response) as never);
    const signal = new AbortController().signal;
    const svg = new TextEncoder().encode("<svg/>");
    await expect(createIgdbImageClient(fetchImpl as never).readSize("https://example.com/a.jpg", signal)).rejects.toBeInstanceOf(IgdbImageError);
    expect(fetchImpl).not.toHaveBeenCalled();
    for (const make of [
      async () => new Response(null, { status: 302, headers: { Location: "https://evil.example/" } }),
      async () => new Response("nope", { status: 404 }),
      async () => Promise.reject(new TypeError("network")),
      async () => new Response(svg, { status: 200 }),
    ]) {
      await expect(client(make).readSize(CANON("co8h3y"), signal)).rejects.toBeInstanceOf(IgdbImageError);
    }
  });

  // [TC-US01-27][SC-MANAGE-24] 读满 65,536 字节仍解析不出宽高：中止读取
  it("读取上限", async () => {
    const junk = new Uint8Array(IGDB_HEAD_MAX * 4);
    junk.set([0xff, 0xd8]);
    const s = stream(junk, 4096);
    const client = createIgdbImageClient((async () => new Response(s.body, { status: 200 })) as never);
    await expect(client.readSize(CANON("co8h3y"), new AbortController().signal)).rejects.toBeInstanceOf(IgdbImageError);
    expect({ cancelled: s.cancel.mock.calls.length, read: s.read() <= IGDB_HEAD_MAX + 4096 }).toEqual({ cancelled: 1, read: true });
  });
});
