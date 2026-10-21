import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadMainImage, loadVideoRange, resetExternalMediaCache } from "../../../src/components/article/external-media";

// 外链照片读取（ADR-010 第 6 点，UT-172）
const SRC = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/e2e/live.jpg";

let created: Blob[];
beforeEach(() => {
  resetExternalMediaCache();
  created = [];
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: (blob: Blob) => (created.push(blob), `blob:mock/${created.length}`) }));
});
afterEach(() => vi.unstubAllGlobals());

const rangeOf = (fetch: ReturnType<typeof vi.fn>, call = 0) => new Headers((fetch.mock.calls[call][1] as RequestInit).headers).get("Range");

describe("loadMainImage", () => {
  it("[SC-AFIL-08][SC-AFIL-09] 按 mainBytes 读取 0…mainBytes-1，结果为 blob 地址；同一地址只请求一次", async () => {
    const fetch = vi.fn(async () => new Response(new Uint8Array(10), { status: 206 }));
    const deps = { fetch, preload: vi.fn() };
    const [a, b] = await Promise.all([loadMainImage(SRC, 21119, deps), loadMainImage(SRC, 21119, deps)]);
    expect([a, b, fetch.mock.calls.length, rangeOf(fetch), created[0].type]).toEqual(["blob:mock/1", "blob:mock/1", 1, "bytes=0-21118", "image/jpeg"]);
  });

  it("服务端忽略 Range 回 200 也可用；4xx / 5xx / 网络错误 reject，之后可重试", async () => {
    expect(await loadMainImage(SRC, 5, { fetch: vi.fn(async () => new Response("x", { status: 200 })), preload: vi.fn() })).toMatch(/^blob:/);
    resetExternalMediaCache();
    const failing = [
      vi.fn(async () => new Response("no", { status: 404 })),
      vi.fn(async () => new Response("no", { status: 500 })),
      vi.fn(async () => {
        throw new TypeError("network");
      }),
    ];
    for (const fetch of failing) await expect(loadMainImage(SRC, 5, { fetch, preload: vi.fn() })).rejects.toThrow();
    const ok = vi.fn(async () => new Response("x", { status: 206 }));
    expect(await loadMainImage(SRC, 5, { fetch: ok, preload: vi.fn() })).toMatch(/^blob:/);
  });

  it("同一地址、不同 mainBytes（作者改了 mp=）分别读取，不复用旧结果", async () => {
    const fetch = vi.fn(async () => new Response(new Uint8Array(1), { status: 206 }));
    await loadMainImage(SRC, 10, { fetch, preload: vi.fn() });
    await loadMainImage(SRC, 20, { fetch, preload: vi.fn() });
    expect([rangeOf(fetch, 0), rangeOf(fetch, 1)]).toEqual(["bytes=0-9", "bytes=0-19"]);
  });

  it("无 mainBytes：不 fetch，预加载原图后返回原图地址", async () => {
    const fetch = vi.fn();
    const preload = vi.fn(async () => {});
    expect(await loadMainImage(SRC, undefined, { fetch, preload })).toBe(SRC);
    expect([fetch.mock.calls.length, preload.mock.calls]).toEqual([0, [[SRC]]]);
  });
});

describe("loadVideoRange", () => {
  it("[SC-AFIL-10] 读取 offset 起 size 字节，类型 video/mp4；只接受 206", async () => {
    const fetch = vi.fn(async () => new Response(new Uint8Array(3), { status: 206 }));
    expect(await loadVideoRange(SRC, { offset: 21119, size: 81755 }, { fetch, preload: vi.fn() })).toMatch(/^blob:/);
    expect([rangeOf(fetch), created[0].type]).toEqual(["bytes=21119-102873", "video/mp4"]);
    resetExternalMediaCache();
    await expect(loadVideoRange(SRC, { offset: 1, size: 2 }, { fetch: vi.fn(async () => new Response("all", { status: 200 })), preload: vi.fn() })).rejects.toThrow();
  });
});
