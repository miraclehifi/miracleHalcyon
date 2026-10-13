// POST /api/admin/posts/:id/unpublish（post api-contract §3）：撤回为草稿，工作稿保留
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { NotFoundError } from "../../../../../domains/post/errors";
import { D1PostRepo } from "../../../../../domains/post/repo";
import { createPostService } from "../../../../../domains/post/service";
import { errorResponse, parsePostId } from "../../../../../lib/api/http";

export const prerender = false;

export function createUnpublishHandler({ db }: { db: D1Database }): APIRoute {
  const service = createPostService({ repo: new D1PostRepo(db) });
  return async ({ params }) => {
    try {
      const id = parsePostId(params.id);
      if (id === null) throw new NotFoundError(0);
      return Response.json(await service.unpublish(id));
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export const POST: APIRoute = (context) => createUnpublishHandler({ db: env.DB })(context);
