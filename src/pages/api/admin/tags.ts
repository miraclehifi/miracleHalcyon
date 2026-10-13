// GET /api/admin/tags?q=（post api-contract §3）：标签补全
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { ValidationError } from "../../../domains/post/errors";
import { D1PostRepo } from "../../../domains/post/repo";
import { createPostService } from "../../../domains/post/service";
import { errorResponse, QUERY_MAX } from "../../../lib/api/http";

export const prerender = false;

export function createTagsHandler({ db }: { db: D1Database }): APIRoute {
  const service = createPostService({ repo: new D1PostRepo(db) });
  return async ({ url }) => {
    try {
      const q = url.searchParams.get("q") ?? "";
      if ([...q].length > QUERY_MAX) throw new ValidationError(["q"]);
      return Response.json({ tags: await service.suggestTags(q) });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export const GET: APIRoute = (context) => createTagsHandler({ db: env.DB })(context);
