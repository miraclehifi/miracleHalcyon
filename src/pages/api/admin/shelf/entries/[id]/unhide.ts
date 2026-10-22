// POST /api/admin/shelf/entries/:id/unhide（shelf api-contract §3）：取消隐藏（幂等）
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { shelfHooksFor } from "../../../../../../lib/rebuild/shelf-hooks";
import { createShelfHideHandler } from "./hide";

export const prerender = false;

export const POST: APIRoute = (context) => createShelfHideHandler({ db: env.DB, bucket: env.MEDIA, hooksFor: shelfHooksFor, hidden: false })(context);
