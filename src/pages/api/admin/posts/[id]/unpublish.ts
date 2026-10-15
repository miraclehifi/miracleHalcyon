// POST /api/admin/posts/:id/unpublish（post api-contract §3）：撤回为草稿，工作稿保留
import type { APIContext, APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { NotFoundError } from "../../../../../domains/post/errors";
import { D1PostRepo } from "../../../../../domains/post/repo";
import { noopHooks, type PublicationHooks } from "../../../../../domains/post/hooks";
import { createPostService } from "../../../../../domains/post/service";
import { errorResponse, parsePostId } from "../../../../../lib/api/http";
import { deployHooksFor } from "../../../../../lib/rebuild/route-hooks";

export const prerender = false;

export function createUnpublishHandler({ db, hooksFor = () => noopHooks }: { db: D1Database; hooksFor?: (context: APIContext) => PublicationHooks }): APIRoute {
  return async (context) => {
    const { params } = context;
    const service = createPostService({ repo: new D1PostRepo(db), hooks: hooksFor(context) });
    try {
      const id = parsePostId(params.id);
      if (id === null) throw new NotFoundError(0);
      return Response.json(await service.unpublish(id));
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export const POST: APIRoute = (context) => createUnpublishHandler({ db: env.DB, hooksFor: deployHooksFor })(context);
