// GET /api/shelf（shelf api-contract §3）：公开书影音列表，只在读者页构建时读取，不经会话校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { publicEntryView, shelfServiceFor, type ShelfRouteDeps } from "../../lib/api/shelf-http";

export const prerender = false;

export function createPublicShelfHandler(deps: ShelfRouteDeps): APIRoute {
  return async (context) => {
    const entries = await shelfServiceFor(deps, context).listPublic();
    return Response.json({ items: entries.map(publicEntryView) }, { headers: { "Cache-Control": "no-store" } });
  };
}

export const GET: APIRoute = (context) => createPublicShelfHandler({ db: env.DB, bucket: env.MEDIA })(context);
