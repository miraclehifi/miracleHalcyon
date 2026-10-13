// GET /api/posts?page=&tag=（post api-contract §4）：公开只读已发布快照列表，不经会话校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { ValidationError } from "../../../domains/post/errors";
import { D1PublishedPostQuery } from "../../../domains/post/published-query";
import { PAGE_SIZE } from "../../../domains/post/service";
import { errorResponse, isPageParam } from "../../../lib/api/http";

export const prerender = false;

export function createPublicPostListHandler({ db }: { db: D1Database }): APIRoute {
  const query = new D1PublishedPostQuery(db);
  return async ({ url }) => {
    let response: Response;
    try {
      // 只认 page 与 tag，其余参数（status、preview 等）一律忽略
      const pageText = url.searchParams.get("page") ?? "1";
      if (!isPageParam(pageText)) throw new ValidationError(["page"]);
      const page = Number(pageText);
      const { items, total } = await query.listPublished({ page, pageSize: PAGE_SIZE, tag: url.searchParams.get("tag") ?? "" });
      response = Response.json({ items, page, pageSize: PAGE_SIZE, total });
    } catch (error) {
      response = errorResponse(error);
    }
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
}

export const GET: APIRoute = (context) => createPublicPostListHandler({ db: env.DB })(context);
