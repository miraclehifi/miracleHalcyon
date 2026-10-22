// /api/admin/shelf/entries/:id（shelf api-contract §3）：GET 读取、PUT 编辑（multipart）、DELETE 删除（连同封面）
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { EntryNotFoundError } from "../../../../../domains/shelf/errors";
import { entryView, parseEntryId, readEntryForm, shelfErrorResponse, shelfServiceFor, type ShelfRouteDeps } from "../../../../../lib/api/shelf-http";
import { shelfHooksFor } from "../../../../../lib/rebuild/shelf-hooks";

export const prerender = false;

const idOf = (param: string | undefined) => {
  const id = parseEntryId(param);
  if (id === null) throw new EntryNotFoundError(0);
  return id;
};

export function createShelfEntryItemHandlers(deps: ShelfRouteDeps) {
  const GET: APIRoute = async (context) => {
    try {
      return Response.json(entryView(await shelfServiceFor(deps, context).get(idOf(context.params.id))));
    } catch (error) {
      return shelfErrorResponse(error);
    }
  };

  const PUT: APIRoute = async (context) => {
    try {
      const id = idOf(context.params.id);
      const form = await readEntryForm(context.request);
      return Response.json(entryView(await shelfServiceFor(deps, context).update(id, form.fields, form.coverChange)));
    } catch (error) {
      return shelfErrorResponse(error);
    }
  };

  const DELETE: APIRoute = async (context) => {
    try {
      await shelfServiceFor(deps, context).remove(idOf(context.params.id));
      return new Response(null, { status: 204 });
    } catch (error) {
      return shelfErrorResponse(error);
    }
  };

  return { GET, PUT, DELETE };
}

const live = (): ShelfRouteDeps => ({ db: env.DB, bucket: env.MEDIA, hooksFor: shelfHooksFor });
export const GET: APIRoute = (context) => createShelfEntryItemHandlers(live()).GET(context);
export const PUT: APIRoute = (context) => createShelfEntryItemHandlers(live()).PUT(context);
export const DELETE: APIRoute = (context) => createShelfEntryItemHandlers(live()).DELETE(context);
