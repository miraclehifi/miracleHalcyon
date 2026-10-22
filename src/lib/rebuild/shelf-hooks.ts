// 书影音接口用的重建钩子（ADR-012 §5）：ShelfHooks 适配 Deploy Hook，与文章发布共用 DEPLOY_HOOK_URL
import type { APIContext } from "astro";
import type { ShelfHooks } from "../../domains/shelf/hooks";
import { deployHooksFor } from "./route-hooks";

export function shelfHooksFor(context: APIContext): ShelfHooks {
  const hooks = deployHooksFor(context);
  return { onShelfChanged: () => hooks.onPublicationChanged({ kind: "updated", slug: "media" }) };
}
