// POST /api/admin/shelf/import（shelf api-contract"导入"，ADR-014）：按豆瓣用户 ID 导入一页标记，不触发重建。会话与 Origin 已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { readJsonBody, shelfErrorResponse, shelfServiceFor, type ShelfRouteDeps } from "../../../../lib/api/shelf-http";

export const prerender = false;

const MAX_BODY_BYTES = 4 * 1024;

export function createImportHandler(deps: ShelfRouteDeps): APIRoute {
  return async (context) => {
    try {
      const body = await readJsonBody(context.request, MAX_BODY_BYTES);
      return Response.json(await shelfServiceFor(deps, context).importPage(body));
    } catch (error) {
      return shelfErrorResponse(error);
    }
  };
}

export const POST: APIRoute = (context) => createImportHandler({ db: env.DB, bucket: env.MEDIA })(context);
