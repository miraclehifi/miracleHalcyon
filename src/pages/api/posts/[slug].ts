// GET /api/posts/:slug（post api-contract §4）：公开只读已发布快照，不经会话校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { D1PublishedPostQuery } from "../../../domains/post/published-query";
import { jsonError } from "../../../lib/api/errors";

export const prerender = false;

const NO_STORE = { "Cache-Control": "no-store" };

export function createPublicPostHandler({ db }: { db: D1Database }): APIRoute {
  const query = new D1PublishedPostQuery(db);
  return async ({ params }) => {
    // 草稿、已撤回、已删除、slug 大小写不符一律 404
    const post = params.slug ? await query.getPublishedBySlug(params.slug) : null;
    if (!post) return jsonError(404, "POST_NOT_FOUND", "文章不存在或已被删除", NO_STORE);
    return Response.json(post, { headers: NO_STORE });
  };
}

export const GET: APIRoute = (context) => createPublicPostHandler({ db: env.DB })(context);
