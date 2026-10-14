// GET /img/{yyyy}/{mm}/{file}（media api-contract）：公开读取 R2 对象。key 不合规直接 404（不访问 R2）；
// 长缓存 + ETag / 304；带 Range 时 206（实况视频）；nosniff + CSP 防止被当作页面执行
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { IMMUTABLE_CACHE } from "../../domains/media/repo";

export const prerender = false;

export const IMAGE_KEY = /^img\/\d{4}\/\d{2}\/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.(png|jpg|webp|gif|live\.mp4)$/;

export interface ReadImageHandlerDeps {
  bucket: R2Bucket;
}

const notFound = () => new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

function contentRange(range: R2Range, size: number): string {
  if ("suffix" in range && range.suffix !== undefined) return `bytes ${size - range.suffix}-${size - 1}/${size}`;
  const offset = "offset" in range && range.offset !== undefined ? range.offset : 0;
  const length = "length" in range && range.length !== undefined ? range.length : size - offset;
  return `bytes ${offset}-${offset + length - 1}/${size}`;
}

export function createReadImageHandler({ bucket }: ReadImageHandlerDeps): APIRoute {
  return async ({ request, params }) => {
    const key = `img/${params.key ?? ""}`;
    if (!IMAGE_KEY.test(key)) return notFound();

    const object = await bucket.get(key, { onlyIf: request.headers, range: request.headers });
    if (!object) return notFound();

    const headers = new Headers({
      "Cache-Control": IMMUTABLE_CACHE,
      ETag: object.httpEtag,
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    });
    if (object.httpMetadata?.contentType) headers.set("Content-Type", object.httpMetadata.contentType);
    if (!("body" in object)) return new Response(null, { status: 304, headers }); // If-None-Match 命中

    if (request.headers.has("Range") && object.range) {
      headers.set("Content-Range", contentRange(object.range, object.size));
      return new Response(object.body, { status: 206, headers });
    }
    return new Response(object.body, { status: 200, headers });
  };
}

export const GET: APIRoute = (context) => createReadImageHandler({ bucket: env.MEDIA })(context);
