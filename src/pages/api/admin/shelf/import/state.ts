// GET /api/admin/shelf/import/state[?uid=]（shelf api-contract"导入"）：上次用的豆瓣 ID 与 6 类别 × 2 状态的同步水位
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { shelfErrorResponse, shelfServiceFor, type ShelfRouteDeps } from "../../../../../lib/api/shelf-http";

export const prerender = false;

export function createImportStateHandler(deps: ShelfRouteDeps): APIRoute {
  return async (context) => {
    try {
      return Response.json(await shelfServiceFor(deps, context).importState(context.url.searchParams.get("uid")));
    } catch (error) {
      return shelfErrorResponse(error);
    }
  };
}

export const GET: APIRoute = (context) => createImportStateHandler({ db: env.DB, bucket: env.MEDIA })(context);
