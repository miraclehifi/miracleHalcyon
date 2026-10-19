// POST /api/admin/storage/cleanup（media api-contract，F-006 US-02）：重新判定后清理全部未引用资源。会话与 Origin 已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { StorageCleanupError } from "../../../../domains/media/storage";
import { jsonError } from "../../../../lib/api/errors";
import { storageServiceFor, type StorageHandlerDeps } from "./orphans";

export const prerender = false;

export function createCleanupHandler(deps: StorageHandlerDeps): APIRoute {
  const service = storageServiceFor(deps);
  const now = deps.now ?? (() => new Date());
  return async () => {
    try {
      return Response.json(await service.cleanupOrphans(now()));
    } catch (error) {
      if (!(error instanceof StorageCleanupError)) throw error;
      console.error("storage cleanup failed", error.cause);
      return jsonError(500, error.code, "清理未完成，请重试");
    }
  };
}

export const POST: APIRoute = (context) => createCleanupHandler({ db: env.DB, bucket: env.MEDIA })(context);
