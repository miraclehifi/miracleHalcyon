// /api/admin/posts/:id（post api-contract §3）：GET 读取；PUT / DELETE 由后续任务补充。会话与 Origin 已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { NotFoundError } from "../../../../domains/post/errors";
import { D1PostRepo } from "../../../../domains/post/repo";
import { createPostService } from "../../../../domains/post/service";
import { errorResponse, parsePostId } from "../../../../lib/api/http";

export const prerender = false;

export interface PostHandlerDeps {
  db: D1Database;
  now?: () => Date;
}

export function createPostHandlers({ db }: PostHandlerDeps) {
  const service = createPostService({ repo: new D1PostRepo(db) });

  const GET: APIRoute = async ({ params }) => {
    try {
      const id = parsePostId(params.id);
      const post = id === null ? null : await service.getForEdit(id);
      if (!post) throw new NotFoundError(id ?? 0);
      return Response.json(post);
    } catch (error) {
      return errorResponse(error);
    }
  };

  return { GET };
}

export const GET: APIRoute = (context) => createPostHandlers({ db: env.DB }).GET(context);
