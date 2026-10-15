import { describe, expect, it, vi } from "vitest";
import { noopHooks } from "../../../src/domains/post/hooks";
import { createDeployHookHooks } from "../../../src/lib/rebuild/deploy-hook";

const URL_WITH_SECRET = "https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/secret-token";
const change = { kind: "published" as const, slug: "hello" };

function setup(fetch: typeof globalThis.fetch) {
  const pending: Promise<unknown>[] = [];
  const log = vi.fn();
  const hooks = createDeployHookHooks({ url: URL_WITH_SECRET, fetch, waitUntil: (p) => pending.push(p), log });
  return { hooks, pending, log };
}

// [TC-US03-02][TC-US03-05][TC-US03-06][SC-REBUILD-02][SC-REBUILD-05][SC-REBUILD-06] READER-UT-10
describe("createDeployHookHooks", () => {
  it("未配置地址时为空实现", () => {
    expect(createDeployHookHooks({ url: undefined, waitUntil: () => {} })).toBe(noopHooks);
    expect(createDeployHookHooks({ url: "", waitUntil: () => {} })).toBe(noopHooks);
  });

  it("发布状态变化时经 waitUntil 发出一次 POST，不阻塞调用方", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
    const { hooks, pending, log } = setup(fetch);
    await hooks.onPublicationChanged(change);
    expect(pending).toHaveLength(1);
    await Promise.all(pending);
    expect(fetch).toHaveBeenCalledWith(URL_WITH_SECRET, { method: "POST" });
    expect(log).not.toHaveBeenCalled();
  });

  it("返回非 2xx 或网络错误时只记日志（含状态 / 错误名，不含地址）", async () => {
    const cases: [typeof globalThis.fetch, Record<string, unknown>][] = [
      [vi.fn(async () => new Response("", { status: 500 })), { status: 500 }],
      [vi.fn(async () => Promise.reject(new TypeError("fetch failed"))), { error: "TypeError" }],
    ];
    for (const [fetch, expected] of cases) {
      const { hooks, pending, log } = setup(fetch);
      await expect(hooks.onPublicationChanged(change)).resolves.toBeUndefined();
      await Promise.all(pending);
      expect(log).toHaveBeenCalledWith("deploy_hook_failed", expected);
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret-token");
    }
  });
});
