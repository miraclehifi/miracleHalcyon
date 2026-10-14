import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { createUploadImageHandler } from "../../../src/pages/api/admin/images";
import { createReadImageHandler } from "../../../src/pages/img/[...key]";
import { GIF_1X1, PNG_1X1 } from "../../unit/media/image-bytes";

// GET /img/{yyyy}/{mm}/{file}（media api-contract）：公开读取，长缓存，ETag / 304，Range / 206；key 不合规直接 404
const SITE = "http://localhost:4321";
const read = createReadImageHandler({ bucket: env.MEDIA });
const upload = createUploadImageHandler({ db: env.DB, bucket: env.MEDIA, now: () => new Date("2026-10-14T03:00:00.000Z") });

async function get(path: string, headers: Record<string, string> = {}) {
  const request = new Request(`${SITE}${path}`, { headers });
  const key = decodeURIComponent(new URL(request.url).pathname).replace(/^\/img\//, "");
  return read({ request, url: new URL(request.url), params: { key } } as unknown as APIContext);
}

async function put(bytes: Uint8Array, name: string, type: string): Promise<string> {
  const body = new FormData();
  body.append("file", new File([bytes as Uint8Array<ArrayBuffer>], name, { type }));
  const request = new Request(`${SITE}/api/admin/images`, { method: "POST", body });
  const response = await upload({ request, url: new URL(request.url) } as unknown as APIContext);
  return ((await response.json()) as { url: string }).url;
}

const headersOf = (response: Response, names: string[]) => Object.fromEntries(names.map((name) => [name, response.headers.get(name)]));

describe("GET /img/*", () => {
  // [MEDIA-UT-08][TC-US05-04] 命中：200、类型取 R2 元数据、长缓存、ETag、nosniff、CSP；字节与原文件一致；If-None-Match 命中 304
  it("命中 200 带长缓存与安全头；ETag 命中 304", async () => {
    const url = await put(GIF_1X1, "anim.gif", "image/gif");
    const hit = await get(url);
    const etag = hit.headers.get("ETag")!;
    const bytes = new Uint8Array(await hit.arrayBuffer());
    const again = await get(url, { "If-None-Match": etag });

    expect({
      status: hit.status,
      headers: headersOf(hit, ["Content-Type", "Cache-Control", "X-Content-Type-Options", "Content-Security-Policy"]),
      etag: /^"[^"]+"$/.test(etag),
      bytes,
      notModified: [again.status, again.headers.get("ETag"), await again.text()],
    }).toEqual({
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
      etag: true,
      bytes: GIF_1X1,
      notModified: [304, etag, ""],
    });
  });

  // [MEDIA-UT-08] 不存在 404；`..` 与不合规 key 404；视频 Range 206
  it("不存在 / 路径穿越 / 不合规 → 404；视频 Range → 206", async () => {
    const videoKey = "img/2026/10/abcdefghij_10x10_808080.live.mp4";
    await env.MEDIA.put(videoKey, new Uint8Array(1000).map((_, i) => i % 256), { httpMetadata: { contentType: "video/mp4" } });
    const statuses = await Promise.all(
      [
        "/img/2026/10/zzzzzzzzzz_1x1_808080.png",
        "/img/2026/10/../../../wrangler.jsonc",
        "/img/2026/10/%2e%2e%2fsecret.png",
        "/img/2026/10/ABCDEFGHIJ_1x1_808080.png",
        "/img/2026/10/abcdefghij_1x1_808080.svg",
        "/img/pool-check.txt",
      ].map(async (path) => (await get(path)).status),
    );
    const ranged = await get(`/${videoKey}`, { Range: "bytes=0-99" });

    expect({
      statuses,
      ranged: [ranged.status, ranged.headers.get("Content-Range"), ranged.headers.get("Accept-Ranges"), ranged.headers.get("Content-Type"), (await ranged.arrayBuffer()).byteLength],
    }).toEqual({
      statuses: [404, 404, 404, 404, 404, 404],
      ranged: [206, "bytes 0-99/1000", "bytes", "video/mp4", 100],
    });
  });

  // [TC-US05-19][SC-IMAGE-08] 同名同内容上传两次得到不同 key，互不覆盖，均可读取
  it("同名同内容两次上传 key 不同且都能读取", async () => {
    const first = await put(PNG_1X1, "same.png", "image/png");
    const second = await put(PNG_1X1, "same.png", "image/png");
    expect({ different: first !== second, statuses: [(await get(first)).status, (await get(second)).status] }).toEqual({ different: true, statuses: [200, 200] });
  });

  // [TC-US05-20][SC-IMAGE-08] 客户端文件名含路径穿越 / Unicode 不影响 key；records 只保留去掉路径的文件名
  it("文件名中的路径与 Unicode 不进入 key", async () => {
    const urls = await Promise.all([put(PNG_1X1, "../../etc/passwd.png", "image/png"), put(PNG_1X1, "照片 ①.png", "image/png")]);
    const names = await Promise.all(
      urls.map(async (url) => (await env.DB.prepare("SELECT original_name FROM images WHERE key = ?").bind(url.slice(1)).first<{ original_name: string }>())?.original_name),
    );
    expect({
      keys: urls.map((url) => /^\/img\/\d{4}\/\d{2}\/[a-z2-7]{10}_1x1_808080\.png$/.test(url)),
      names,
      readable: await Promise.all(urls.map(async (url) => (await get(url)).status)),
    }).toEqual({ keys: [true, true], names: ["passwd.png", "照片 ①.png"], readable: [200, 200] });
  });
});
