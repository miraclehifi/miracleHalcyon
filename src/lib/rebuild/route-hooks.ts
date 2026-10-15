// 接口路由用的重建钩子（ADR-007 §3）：读 Worker Secret DEPLOY_HOOK_URL，借本次请求的 ExecutionContext.waitUntil 发出
import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import type { PublicationHooks } from "../../domains/post/hooks";
import { createDeployHookHooks } from "./deploy-hook";

type Locals = { cfContext?: { waitUntil(promise: Promise<unknown>): void } };

export function deployHooksFor(context: APIContext): PublicationHooks {
  const cf = (context.locals as Locals).cfContext;
  return createDeployHookHooks({
    url: env.DEPLOY_HOOK_URL,
    waitUntil: (promise) => (cf ? cf.waitUntil(promise) : void promise.catch(() => undefined)),
  });
}
