// GET /api/admin/afilmory/photos/{id}（media api-contract，F-001 US-13）：读取登记的 Afilmory 站点中一张照片的信息。
// 会话已由 middleware 校验；服务端只请求 {site}/photos/{id}，不跟随重定向
import type { APIRoute } from "astro";
import { site } from "../../../../../config/site";
import { AfilmoryNotFoundError, AfilmoryValidationError, fetchAfilmoryPhoto } from "../../../../../domains/media/afilmory";
import { jsonError, serverMisconfigured } from "../../../../../lib/api/errors";

export const prerender = false;

export interface AfilmoryPhotoHandlerDeps {
  site: string | undefined;
  fetch?: typeof fetch;
}

export function createAfilmoryPhotoHandler(deps: AfilmoryPhotoHandlerDeps): APIRoute {
  return async ({ params }) => {
    if (!deps.site) return serverMisconfigured();
    try {
      return Response.json(await fetchAfilmoryPhoto(params.id ?? "", { site: deps.site, fetch: deps.fetch }));
    } catch (error) {
      if (error instanceof AfilmoryValidationError) return jsonError(400, error.code, "照片编号格式不正确");
      if (error instanceof AfilmoryNotFoundError) return jsonError(404, error.code, "Afilmory 中没有这张照片");
      console.error("afilmory photo failed", error);
      return jsonError(502, "UPSTREAM_UNAVAILABLE", "Afilmory 暂时无法访问");
    }
  };
}

export const GET: APIRoute = (context) => createAfilmoryPhotoHandler({ site: site.afilmory?.site })(context);
