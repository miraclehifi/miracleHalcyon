// POST /api/admin/posts/:id/publish（post api-contract §3）：发布与发布更新共用；已发布且无修改时幂等
import type { APIContext, APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { NotFoundError } from "../../../../../domains/post/errors";
import { D1PostRepo } from "../../../../../domains/post/repo";
import { noopHooks, type PublicationHooks } from "../../../../../domains/post/hooks";
import { createPostService } from "../../../../../domains/post/service";
import { errorResponse, parsePostId } from "../../../../../lib/api/http";
import { deployHooksFor } from "../../../../../lib/rebuild/route-hooks";

export const prerender = false;

// hooksFor：发布状态变化后触发读者页重建（F-002 Deploy Hook）；每个请求一个，借该请求的 waitUntil
export function createPublishHandler({
  db,
  now = () => new Date(),
  hooksFor = () => noopHooks,
}: {
  db: D1Database;
  now?: () => Date;
  hooksFor?: (context: APIContext) => PublicationHooks;
}): APIRoute {
  return async (context) => {
    const { params } = context;
    const service = createPostService({ repo: new D1PostRepo(db), hooks: hooksFor(context) });
    try {
      const id = parsePostId(params.id);
      if (id === null) throw new NotFoundError(0);
      return Response.json(await service.publish(id, now()));
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export const POST: APIRoute = (context) => createPublishHandler({ db: env.DB, hooksFor: deployHooksFor })(context);
