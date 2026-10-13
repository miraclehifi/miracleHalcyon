// /api/admin/posts（post api-contract §3）：POST 新建；GET 列表由后续任务补充。会话与 Origin 已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { D1PostRepo } from "../../../../domains/post/repo";
import { createPostService } from "../../../../domains/post/service";
import { errorResponse, parseDraftInput, readJson } from "../../../../lib/api/http";

export const prerender = false;

export interface PostsHandlerDeps {
  db: D1Database;
  now?: () => Date;
}

// 字段全部可选，缺省按空值处理
export function createCreatePostHandler({ db, now = () => new Date() }: PostsHandlerDeps): APIRoute {
  const service = createPostService({ repo: new D1PostRepo(db) });
  return async ({ request }) => {
    try {
      const input = parseDraftInput(await readJson(request), { requireAll: false });
      const post = await service.create(input, now());
      return Response.json(post, { status: 201, headers: { Location: `/api/admin/posts/${post.id}` } });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export const POST: APIRoute = (context) => createCreatePostHandler({ db: env.DB })(context);
