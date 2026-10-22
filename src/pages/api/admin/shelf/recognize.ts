// POST /api/admin/shelf/recognize（shelf api-contract §3，ADR-011）：粘贴豆瓣分享内容识别条目数据。会话与 Origin 已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { BadRequestError, parseEntryId, shelfErrorResponse, shelfServiceFor, type ShelfRouteDeps } from "../../../../lib/api/shelf-http";

export const prerender = false;

const MAX_BODY_BYTES = 64 * 1024;

async function readBody(request: Request): Promise<{ text: unknown; excludeId: unknown }> {
  if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES) throw new BadRequestError("请求内容过大");
  try {
    const body = JSON.parse(await request.text());
    return body && typeof body === "object" ? body : { text: undefined, excludeId: undefined };
  } catch {
    throw new BadRequestError("请求内容不是有效的 JSON");
  }
}

export function createRecognizeHandler(deps: ShelfRouteDeps): APIRoute {
  return async (context) => {
    try {
      const { text, excludeId } = await readBody(context.request);
      const exclude = typeof excludeId === "string" ? parseEntryId(excludeId) : null;
      const result = await shelfServiceFor(deps, context).recognize(text as string, exclude);
      if (result.duplicate) {
        const { id, ...rest } = result.duplicate;
        return Response.json({ duplicate: { id: String(id), ...rest } });
      }
      return Response.json({ fields: result.fields, missing: result.missing });
    } catch (error) {
      return shelfErrorResponse(error);
    }
  };
}

export const POST: APIRoute = (context) => createRecognizeHandler({ db: env.DB, bucket: env.MEDIA })(context);
