import type { APIContext } from "astro";
import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { D1PostRepo } from "../../../src/domains/post/repo";
import { createPostService } from "../../../src/domains/post/service";
import { createDeployHookHooks } from "../../../src/lib/rebuild/deploy-hook";
import { createPostHandlers } from "../../../src/pages/api/admin/posts/[id]";
import { createPublishHandler } from "../../../src/pages/api/admin/posts/[id]/publish";
import { createUnpublishHandler } from "../../../src/pages/api/admin/posts/[id]/unpublish";

// 发布后触发读者页重建（ADR-007 §3，US-03）：接口路由注入 Deploy Hook 钩子；fetch 替身记录请求，不访问外网
const NOW = new Date("2026-10-15T00:00:00.000Z");
const HOOK = "https://hooks.example.test/deploy/secret";
const draft = (slug: string): DraftInput => ({ title: `重建 ${slug}`, slug, tags: [], summary: "", body: "正文", publishedAt: "2026-10-15", cover: null });
const service = createPostService({ repo: new D1PostRepo(env.DB) });

function rig(response: () => Promise<Response> = async () => new Response("{}", { status: 200 }), url: string | undefined = HOOK) {
  const fetch = vi.fn(response);
  const pending: Promise<unknown>[] = [];
  const log = vi.fn();
  const hooksFor = () => createDeployHookHooks({ url, fetch, waitUntil: (p) => pending.push(p), log });
  const call = async (handler: (c: APIContext) => Response | Promise<Response>, id: string, method = "POST") => {
    const request = new Request(`http://localhost:4321/api/admin/posts/${id}`, { method });
    const result = await handler({ request, url: new URL(request.url), params: { id }, locals: {} } as unknown as APIContext);
    await Promise.all(pending);
    return result.status;
  };
  return {
    fetch,
    log,
    publish: (id: string) => call(createPublishHandler({ db: env.DB, now: () => NOW, hooksFor }), id),
    unpublish: (id: string) => call(createUnpublishHandler({ db: env.DB, hooksFor }), id),
    remove: (id: string) => call(createPostHandlers({ db: env.DB, hooksFor }).DELETE as never, id, "DELETE"),
  };
}

describe("发布后触发重建", () => {
  // [TC-US03-02][SC-REBUILD-02]
  it("[TC-US03-02] 发布成功后 POST Deploy Hook 一次", async () => {
    const { fetch, publish } = rig();
    const { id } = await service.create(draft("rebuild-publish"), NOW);
    expect(await publish(id)).toBe(200);
    expect(fetch.mock.calls).toEqual([[HOOK, { method: "POST" }]]);
  });

  // [TC-US03-03][SC-REBUILD-03] 发布更新、撤回、重新发布、删除各一次；失败操作（对草稿撤回 409）不发
  it("[TC-US03-03] 发布更新、撤回、删除各触发一次，失败操作不触发", async () => {
    const { fetch, publish, unpublish, remove } = rig();
    const { id } = await service.create(draft("rebuild-flow"), NOW);
    await publish(id);
    await service.saveDraft(Number(id), { ...draft("rebuild-flow"), body: "修改" }, NOW);
    fetch.mockClear();
    const statuses = [await publish(id), await unpublish(id), await unpublish(id), await publish(id), await remove(id)];
    expect(statuses).toEqual([200, 200, 409, 200, 204]);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  // [TC-US03-04][SC-REBUILD-04]
  it("[TC-US03-04] 删除从未发布的草稿不触发", async () => {
    const { fetch, remove } = rig();
    const { id } = await service.create(draft("rebuild-draft"), NOW);
    expect(await remove(id)).toBe(204);
    expect(fetch).not.toHaveBeenCalled();
  });

  // [TC-US03-05][SC-REBUILD-05] Deploy Hook 失败不影响发布，日志不含地址
  it("[TC-US03-05] Deploy Hook 失败时发布照常成功", async () => {
    for (const response of [async () => new Response("", { status: 500 }), async () => Promise.reject(new TypeError("fetch failed"))]) {
      const { log, publish } = rig(response);
      const { id } = await service.create(draft(`rebuild-fail-${Math.random().toString(36).slice(2, 7)}`), NOW);
      expect(await publish(id)).toBe(200);
      expect((await service.getForEdit(Number(id)))?.status).toBe("published");
      expect(log).toHaveBeenCalledOnce();
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
    }
  });

  // [TC-US03-06][SC-REBUILD-06]
  it("[TC-US03-06] 未配置 Deploy Hook 时静默跳过", async () => {
    const { fetch, log, publish } = rig(undefined, ""); // 未配置：Secret 为空
    const { id } = await service.create(draft("rebuild-none"), NOW);
    expect(await publish(id)).toBe(200);
    expect([fetch.mock.calls.length, log.mock.calls.length]).toEqual([0, 0]);
  });
});
