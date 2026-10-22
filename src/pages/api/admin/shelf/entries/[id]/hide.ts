// POST /api/admin/shelf/entries/:id/hide（shelf api-contract §3）：隐藏（幂等）；unhide.ts 复用同一处理函数
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { EntryNotFoundError } from "../../../../../../domains/shelf/errors";
import { entryView, parseEntryId, shelfErrorResponse, shelfServiceFor, type ShelfRouteDeps } from "../../../../../../lib/api/shelf-http";
import { shelfHooksFor } from "../../../../../../lib/rebuild/shelf-hooks";

export const prerender = false;

export function createShelfHideHandler(deps: ShelfRouteDeps & { hidden: boolean }): APIRoute {
  return async (context) => {
    try {
      const id = parseEntryId(context.params.id);
      if (id === null) throw new EntryNotFoundError(0);
      return Response.json(entryView(await shelfServiceFor(deps, context).setHidden(id, deps.hidden)));
    } catch (error) {
      return shelfErrorResponse(error);
    }
  };
}

export const POST: APIRoute = (context) => createShelfHideHandler({ db: env.DB, bucket: env.MEDIA, hooksFor: shelfHooksFor, hidden: true })(context);
