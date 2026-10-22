// GET /covers/{yyyy}/{mm}/{file}（shelf api-contract，ADR-012 §4）：公开读取书影音封面。key 不合规直接 404（不访问 R2）；
// key 不可变，长缓存；nosniff + CSP 防止被当作页面执行
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { IMMUTABLE_CACHE, R2CoverStore } from "../../domains/shelf/cover-store";
import { isCoverKey } from "../../domains/shelf/entry";

export const prerender = false;

const notFound = () => new Response("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export function createReadCoverHandler({ bucket }: { bucket: R2Bucket }): APIRoute {
  const store = new R2CoverStore(bucket);
  return async ({ params }) => {
    const key = `covers/${params.key ?? ""}`;
    if (!isCoverKey(key)) return notFound();
    const object = await store.get(key);
    if (!object) return notFound();
    const headers = new Headers({
      "Cache-Control": IMMUTABLE_CACHE,
      ETag: object.httpEtag,
      "Content-Length": String(object.size),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    });
    if (object.contentType) headers.set("Content-Type", object.contentType);
    return new Response(object.body, { status: 200, headers });
  };
}

export const GET: APIRoute = (context) => createReadCoverHandler({ bucket: env.MEDIA })(context);
