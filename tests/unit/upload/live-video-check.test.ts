import { afterEach, describe, expect, it, vi } from "vitest";
import { hasLiveVideo, resetLiveVideoCache } from "../../../src/lib/upload/live-video-check";

// 媒体上传 module-spec §3"实况视频检查"（UT-165 的检查函数部分，SC-LAYOUT-15）：只对站内图片 key 请求同名 .live.mp4
// （Range bytes=0-0，不走缓存）；200 / 206 → true，其余与网络错误 → false；按 URL 会话内缓存，并发复用同一个请求
afterEach(() => {
  vi.unstubAllGlobals();
  resetLiveVideoCache();
});

const KEY = "/img/2026/10/jjjjjjjjjj_960x1280_6b7f8e.jpg";

describe("hasLiveVideo", () => {
  it("站内 key：请求 .live.mp4 的第一个字节，按状态判断；片段不影响；结果缓存", async () => {
    const requests: [string, string | null, RequestCache | undefined][] = [];
    const status: Record<string, number> = { "/img/2026/10/jjjjjjjjjj_960x1280_6b7f8e.live.mp4": 206, "/img/2026/10/aaaaaaaaaa_1600x900_556677.live.mp4": 404 };
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      requests.push([url, new Headers(init?.headers).get("Range"), init?.cache]);
      if (url.includes("bbbbbbbbbb")) throw new TypeError("Failed to fetch");
      return new Response(null, { status: status[url] ?? 200 });
    });
    const results = await Promise.all([hasLiveVideo(`${KEY}#wide,live`), hasLiveVideo(KEY), hasLiveVideo("/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg"), hasLiveVideo("/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg")]);
    const again = await hasLiveVideo(KEY);
    const external = await hasLiveVideo("https://example.com/a.jpg");
    expect({ results, again, external, requests }).toEqual({
      results: [true, true, false, false],
      again: true,
      external: false,
      requests: [
        ["/img/2026/10/jjjjjjjjjj_960x1280_6b7f8e.live.mp4", "bytes=0-0", "no-store"],
        ["/img/2026/10/aaaaaaaaaa_1600x900_556677.live.mp4", "bytes=0-0", "no-store"],
        ["/img/2026/10/bbbbbbbbbb_1200x800_112233.live.mp4", "bytes=0-0", "no-store"],
      ],
    });
  });
});
