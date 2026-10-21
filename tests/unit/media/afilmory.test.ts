import { describe, expect, it, vi } from "vitest";
import {
  AfilmoryNotFoundError,
  AfilmoryUpstreamError,
  AfilmoryValidationError,
  fetchAfilmoryPhoto,
  parseAfilmoryManifest,
  toPhotoInfo,
} from "../../../src/domains/media/afilmory";
import page from "../../fixtures/afilmory/photo-page.html?raw";

// Afilmory 照片信息（media domain-model §10，US-13）。夹具取自真实照片页（保留 4 张：动态照片 18369、普通 18382、子目录 23473、9332）
const SITE = "https://miraclehalcyon.afilmory.art";
const RAW = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/";
const photoOf = (id: string) => parseAfilmoryManifest(page).find((p) => p.id === id)!;

describe("parseAfilmoryManifest", () => {
  // [MEDIA-UT-11] 夹具页解析出 4 张；没有清单、JSON 截断、data 不是数组 → AfilmoryUpstreamError
  it("解析夹具页，异常页面抛上游错误", () => {
    expect(parseAfilmoryManifest(page).map((p) => p.id)).toEqual(["23473", "18382", "18369", "9332"]);
    const broken = [
      "<html><body>没有清单</body></html>",
      '<script id="manifest">window.__MANIFEST__ = {"version":"v10","data":[{"id"</script>',
      '<script id="manifest">window.__MANIFEST__ = {"version":"v10","data":{}};</script>',
    ];
    for (const html of broken) expect(() => parseAfilmoryManifest(html)).toThrow(AfilmoryUpstreamError);
  });
});

describe("toPhotoInfo", () => {
  // [MEDIA-UT-12] 动态照片带 video；普通照片无；子目录中文路径编码；主色为 thumbHash 平均色
  it("转换字段", () => {
    expect(toPhotoInfo(photoOf("18369"))).toEqual({
      id: "18369",
      url: `${RAW}18369.jpg`,
      thumbnail: `${RAW}.afilmory/thumbnails/18369.jpg`,
      width: 3072,
      height: 4096,
      rgb: "8c778e",
      video: { offset: 3337665, size: 14749941 },
    });
    expect(toPhotoInfo(photoOf("18382"))).not.toHaveProperty("video");
    expect(toPhotoInfo(photoOf("23473")).url).toBe(`${RAW}%E6%89%8B%E5%8A%9E/wf2026/23473.jpg`);
  });

  it("video 不是 motion-photo 时忽略；尺寸、地址不合法抛错；thumbHash 非法时主色取缺省", () => {
    const base = photoOf("18369");
    expect(toPhotoInfo({ ...base, video: { type: "live-photo", offset: 1, size: 2 } })).not.toHaveProperty("video");
    expect(toPhotoInfo({ ...base, video: { type: "motion-photo", offset: 0, size: 2 } })).not.toHaveProperty("video");
    expect(() => toPhotoInfo({ ...base, width: 0 })).toThrow(AfilmoryUpstreamError);
    expect(() => toPhotoInfo({ ...base, height: 20001 })).toThrow(AfilmoryUpstreamError);
    expect(() => toPhotoInfo({ ...base, originalUrl: "http://raw.githubusercontent.com/x.jpg" })).toThrow(AfilmoryUpstreamError);
    expect(toPhotoInfo({ ...base, thumbHash: "zz" }).rgb).toBe("808080");
    expect(toPhotoInfo({ ...base, thumbHash: undefined }).rgb).toBe("808080");
  });
});

describe("fetchAfilmoryPhoto", () => {
  const ok = () => vi.fn(async () => new Response(page, { status: 200 }));

  // [MEDIA-UT-13] 只请求 {site}/photos/{id}，不跟随重定向
  it("请求登记站点的照片页", async () => {
    const fetch = ok();
    const info = await fetchAfilmoryPhoto("18382", { site: SITE, fetch });
    expect(info.width).toBe(3068);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect([url, init.redirect]).toEqual([`${SITE}/photos/18382`, "manual"]);
  });

  it("非法 id 不请求；上游异常为 Upstream；清单中没有为 NotFound", async () => {
    const fetch = ok();
    for (const id of ["../x", "a b", "x".repeat(65), ""]) {
      await expect(fetchAfilmoryPhoto(id, { site: SITE, fetch })).rejects.toBeInstanceOf(AfilmoryValidationError);
    }
    expect(fetch).not.toHaveBeenCalled();

    const upstream = [
      vi.fn(async () => new Response("err", { status: 500 })),
      vi.fn(async () => new Response(null, { status: 302, headers: { Location: "https://evil.example/" } })),
      vi.fn(async () => {
        throw new TypeError("network");
      }),
    ];
    for (const f of upstream) await expect(fetchAfilmoryPhoto("18369", { site: SITE, fetch: f })).rejects.toBeInstanceOf(AfilmoryUpstreamError);

    const hang = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason))));
    await expect(fetchAfilmoryPhoto("18369", { site: SITE, fetch: hang as unknown as typeof fetch, timeoutMs: 20 })).rejects.toBeInstanceOf(AfilmoryUpstreamError);

    await expect(fetchAfilmoryPhoto("99999", { site: SITE, fetch })).rejects.toBeInstanceOf(AfilmoryNotFoundError);
  });
});
