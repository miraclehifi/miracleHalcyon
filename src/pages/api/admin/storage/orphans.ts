// GET /api/admin/storage/orphans（media api-contract，F-006 US-01）：统计未引用图片与实况视频。会话已由 middleware 校验
import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { D1ImageRepo, R2MediaStore } from "../../../../domains/media/repo";
import { createStorageService } from "../../../../domains/media/storage";
import { D1ImageReferenceQuery } from "../../../../domains/post/image-reference-query";
import { jsonError } from "../../../../lib/api/errors";

export const prerender = false;

export interface StorageHandlerDeps {
  db: D1Database;
  bucket: R2Bucket;
  now?: () => Date;
}

export function storageServiceFor({ db, bucket }: StorageHandlerDeps) {
  return createStorageService({ imageRepo: new D1ImageRepo(db), mediaStore: new R2MediaStore(bucket), references: new D1ImageReferenceQuery(db) });
}

export function createOrphansHandler(deps: StorageHandlerDeps): APIRoute {
  const service = storageServiceFor(deps);
  const now = deps.now ?? (() => new Date());
  return async () => {
    const checkedAt = now();
    try {
      return Response.json({ summary: await service.detectOrphans(checkedAt), checkedAt: checkedAt.toISOString() });
    } catch (error) {
      console.error("orphan detection failed", error);
      return jsonError(500, "INTERNAL_ERROR", "检测失败，请重试");
    }
  };
}

export const GET: APIRoute = (context) => createOrphansHandler({ db: env.DB, bucket: env.MEDIA })(context);
