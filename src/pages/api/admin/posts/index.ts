// /api/admin/posts（post api-contract §3）：GET 列表、POST 新建。会话与 Origin 已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { ValidationError } from "../../../../domains/post/errors";
import { D1PostRepo, type ListStatus } from "../../../../domains/post/repo";
import { createPostService } from "../../../../domains/post/service";
import { errorResponse, parseDraftInput, readJson } from "../../../../lib/api/http";

export const prerender = false;

export interface PostsHandlerDeps {
  db: D1Database;
  now?: () => Date;
}

const STATUSES: ListStatus[] = ["all", "draft", "published"];
const Q_MAX = 100;

// 查询参数：status 默认 all，page 默认 1，q 可选；不合法 → 400
function parseListQuery(params: URLSearchParams): { status: ListStatus; q: string; page: number } {
  const status = (params.get("status") ?? "all") as ListStatus;
  const pageText = params.get("page") ?? "1";
  const q = params.get("q") ?? "";
  const invalid = [
    !STATUSES.includes(status) && "status",
    !/^[1-9]\d{0,8}$/.test(pageText) && "page",
    [...q].length > Q_MAX && "q",
  ].filter((field): field is string => Boolean(field));
  if (invalid.length > 0) throw new ValidationError(invalid);
  return { status, q, page: Number(pageText) };
}

export function createListPostsHandler({ db }: PostsHandlerDeps): APIRoute {
  const service = createPostService({ repo: new D1PostRepo(db) });
  return async ({ url }) => {
    try {
      return Response.json(await service.list(parseListQuery(url.searchParams)));
    } catch (error) {
      return errorResponse(error);
    }
  };
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

export const GET: APIRoute = (context) => createListPostsHandler({ db: env.DB })(context);
export const POST: APIRoute = (context) => createCreatePostHandler({ db: env.DB })(context);
