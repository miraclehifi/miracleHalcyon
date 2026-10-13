// POST /api/admin/posts/:id/publish（post api-contract §3）：发布与发布更新共用；已发布且无修改时幂等
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { NotFoundError } from "../../../../../domains/post/errors";
import { D1PostRepo } from "../../../../../domains/post/repo";
import { createPostService } from "../../../../../domains/post/service";
import { errorResponse, parsePostId } from "../../../../../lib/api/http";

export const prerender = false;

export function createPublishHandler({ db, now = () => new Date() }: { db: D1Database; now?: () => Date }): APIRoute {
  const service = createPostService({ repo: new D1PostRepo(db) }); // 钩子：F-001 为空实现，F-002 接入重建
  return async ({ params }) => {
    try {
      const id = parsePostId(params.id);
      if (id === null) throw new NotFoundError(0);
      return Response.json(await service.publish(id, now()));
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export const POST: APIRoute = (context) => createPublishHandler({ db: env.DB })(context);
