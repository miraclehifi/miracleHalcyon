// 发布后触发读者页重建（ADR-007 §3、reader module-spec §5）：PublicationHooks 的 Deploy Hook 实现。
// waitUntil 中 POST Deploy Hook，不阻塞接口响应；失败只记日志（不记录含密钥的地址），作者可在 Cloudflare 控制台手动重建
import { noopHooks, type PublicationHooks } from "../../domains/post/hooks";

export interface DeployHookDeps {
  url: string | undefined; // env.DEPLOY_HOOK_URL（Worker Secret）；本地、E2E 不配置
  fetch?: typeof fetch;
  waitUntil: (promise: Promise<unknown>) => void;
  log?: (event: string, detail: Record<string, unknown>) => void;
}

const defaultLog = (event: string, detail: Record<string, unknown>) => console.error(event, detail);

export function createDeployHookHooks({ url, fetch: fetchImpl = fetch, waitUntil, log = defaultLog }: DeployHookDeps): PublicationHooks {
  if (!url) return noopHooks;
  return {
    async onPublicationChanged() {
      const request = fetchImpl(url, { method: "POST" }).then(
        (response) => {
          if (!response.ok) log("deploy_hook_failed", { status: response.status });
        },
        (error: unknown) => log("deploy_hook_failed", { error: (error as Error)?.name ?? "Error" }),
      );
      waitUntil(request);
    },
  };
}
