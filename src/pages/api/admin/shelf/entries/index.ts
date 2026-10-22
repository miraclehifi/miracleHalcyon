// /api/admin/shelf/entries（shelf api-contract §3）：GET 列表（含隐藏，带计数）、POST 新增。会话与 Origin 已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { entryView, readEntryForm, shelfErrorResponse, shelfServiceFor, type ShelfRouteDeps } from "../../../../../lib/api/shelf-http";
import { shelfHooksFor } from "../../../../../lib/rebuild/shelf-hooks";

export const prerender = false;

export function createShelfEntriesHandlers(deps: ShelfRouteDeps) {
  const GET: APIRoute = async (context) => {
    try {
      const type = context.url.searchParams.get("type") ?? "book";
      const service = shelfServiceFor(deps, context);
      const items = await service.list(type);
      const counts = await service.counts(items[0]?.type ?? (type as never));
      return Response.json({ items: items.map(entryView), counts });
    } catch (error) {
      return shelfErrorResponse(error);
    }
  };

  const POST: APIRoute = async (context) => {
    try {
      const form = await readEntryForm(context.request);
      const entry = await shelfServiceFor(deps, context).create(form.fields, form.cover);
      return Response.json(entryView(entry), { status: 201 });
    } catch (error) {
      return shelfErrorResponse(error);
    }
  };

  return { GET, POST };
}

const live = (): ShelfRouteDeps => ({ db: env.DB, bucket: env.MEDIA, hooksFor: shelfHooksFor });
export const GET: APIRoute = (context) => createShelfEntriesHandlers(live()).GET(context);
export const POST: APIRoute = (context) => createShelfEntriesHandlers(live()).POST(context);
