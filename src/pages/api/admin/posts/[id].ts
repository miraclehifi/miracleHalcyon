// /api/admin/posts/:id（post api-contract §3）：GET 读取、PUT 自动保存；DELETE 由后续任务补充。会话与 Origin 已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { NotFoundError } from "../../../../domains/post/errors";
import { D1PostRepo } from "../../../../domains/post/repo";
import { createPostService } from "../../../../domains/post/service";
import { errorResponse, parseDraftInput, parsePostId, readJson } from "../../../../lib/api/http";

export const prerender = false;

export interface PostHandlerDeps {
  db: D1Database;
  now?: () => Date;
}

export function createPostHandlers({ db, now = () => new Date() }: PostHandlerDeps) {
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

  // 整份覆盖工作稿；请求体里的 status、id 等字段一律忽略（不能通过保存改变发布状态，US-06）
  const PUT: APIRoute = async ({ params, request }) => {
    try {
      const id = parsePostId(params.id);
      if (id === null) throw new NotFoundError(0);
      const input = parseDraftInput(await readJson(request), { requireAll: true });
      return Response.json(await service.saveDraft(id, input, now()));
    } catch (error) {
      return errorResponse(error);
    }
  };

  return { GET, PUT };
}

export const GET: APIRoute = (context) => createPostHandlers({ db: env.DB }).GET(context);
export const PUT: APIRoute = (context) => createPostHandlers({ db: env.DB }).PUT(context);
