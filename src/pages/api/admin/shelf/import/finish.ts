// POST /api/admin/shelf/import/finish（shelf api-contract"导入"，ADR-014 §2）：导入结束后 changed > 0 时触发一次重建
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { readJsonBody, shelfErrorResponse, shelfServiceFor, type ShelfRouteDeps } from "../../../../../lib/api/shelf-http";
import { shelfHooksFor } from "../../../../../lib/rebuild/shelf-hooks";

export const prerender = false;

const MAX_BODY_BYTES = 1024;

export function createImportFinishHandler(deps: ShelfRouteDeps): APIRoute {
  return async (context) => {
    try {
      const body = await readJsonBody(context.request, MAX_BODY_BYTES);
      const changed = body && typeof body === "object" ? (body as { changed?: unknown }).changed : undefined;
      await shelfServiceFor(deps, context).finishImport(changed);
      return new Response(null, { status: 204 });
    } catch (error) {
      return shelfErrorResponse(error);
    }
  };
}

export const POST: APIRoute = (context) => createImportFinishHandler({ db: env.DB, bucket: env.MEDIA, hooksFor: shelfHooksFor })(context);
