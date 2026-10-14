import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosaveController, type AutosaveState } from "../../../src/lib/autosave/controller";
import type { DraftInput } from "../../../src/domains/post/content";

// [ED-UT-02 Sprint 1 子集][SC-AUTOSAVE] 自动保存状态机（editor module-spec §2）
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const CONTENT: DraftInput = { title: "T", slug: "t", tags: [], summary: "", body: "B", publishedAt: "2026-10-13" };
const view = (id: string, updatedAt: string) => ({ ...CONTENT, id, status: "draft", hasUnpublishedChanges: false, lastPublishedAt: null, createdAt: updatedAt, updatedAt });

// 可控的 fetch：每次调用排队，由测试决定何时、以什么结果完成
function controllableFetch() {
  const calls: { method: string; url: string; resolve(response: Response): void; reject(error: Error): void }[] = [];
  const fetchMock = vi.fn<typeof fetch>((input, init) => new Promise<Response>((resolve, reject) => calls.push({ method: init?.method ?? "GET", url: String(input), resolve, reject })));
  return { fetchMock, calls };
}

const tick = (ms: number) => vi.advanceTimersByTimeAsync(ms);

describe("createAutosaveController", () => {
  it("2 秒防抖；首次 POST 后改 PUT；保存中再编辑完成后立即再保存；网络错误退避重试；409 不重试", async () => {
    const { fetchMock, calls } = controllableFetch();
    const states: AutosaveState["status"][] = [];
    const created: string[] = [];
    const controller = createAutosaveController({
      postId: null,
      getContent: () => CONTENT,
      fetch: fetchMock,
      onCreated: (id) => created.push(id),
      onChange: (state) => states.push(state.status),
    });

    controller.edit();
    await tick(1999);
    const beforeDebounce = calls.length;
    await tick(1);
    const first = { method: calls[0].method, url: calls[0].url };
    calls[0].resolve(Response.json(view("7", "2026-10-13T01:00:00.000Z"), { status: 201 }));
    await tick(0);
    const afterCreate = { ...controller.state(), created: [...created] };

    controller.edit();
    await tick(2000);
    controller.edit(); // 保存中再编辑
    calls[1].resolve(Response.json(view("7", "2026-10-13T01:00:05.000Z")));
    await tick(0); // 不等 2 秒，立即再保存
    const resave = { count: calls.length, method: calls[2]?.method, url: calls[2]?.url };
    calls[2].reject(new TypeError("Failed to fetch"));
    await tick(0);
    const afterNetworkError = controller.state();
    await tick(1999);
    const beforeRetry = calls.length;
    await tick(1);
    calls[3].resolve(new Response("oops", { status: 503 }));
    await tick(4000); // 第二次退避 4 秒
    calls[4].resolve(Response.json(view("7", "2026-10-13T01:00:20.000Z")));
    await tick(0);
    const recovered = controller.state();

    controller.edit();
    await tick(2000);
    calls[5].resolve(Response.json({ error: { code: "SLUG_TAKEN", message: "slug 已存在，请换一个" } }, { status: 409 }));
    await tick(60_000);
    const conflict = { ...controller.state(), calls: calls.length };
    controller.dispose();

    expect({ beforeDebounce, first, afterCreate, resave, afterNetworkError, beforeRetry, recovered, conflict, states: [...new Set(states)] }).toEqual({
      beforeDebounce: 0,
      first: { method: "POST", url: "/api/admin/posts" },
      afterCreate: { status: "saved", savedAt: "2026-10-13T01:00:00.000Z", error: null, created: ["7"] },
      resave: { count: 3, method: "PUT", url: "/api/admin/posts/7" },
      afterNetworkError: { status: "failed", savedAt: "2026-10-13T01:00:05.000Z", error: { kind: "network" } },
      beforeRetry: 3,
      recovered: { status: "saved", savedAt: "2026-10-13T01:00:20.000Z", error: null },
      conflict: { status: "failed", savedAt: "2026-10-13T01:00:20.000Z", error: { kind: "conflict", code: "SLUG_TAKEN", message: "slug 已存在，请换一个" }, calls: 6 },
      states: ["dirty", "saving", "saved", "failed"],
    });
  });

  // [TC-US09-02][SC-DELETE-02] 删除期间暂停：等进行中的保存结束，之后编辑 / flush 不再发请求；删除失败恢复后补存
  it("disable 等待进行中的保存并停发请求；enable 后补存期间的修改", async () => {
    const { fetchMock, calls } = controllableFetch();
    const controller = createAutosaveController({ postId: "7", getContent: () => CONTENT, fetch: fetchMock });

    controller.edit();
    await tick(2000); // PUT 进行中
    let disabled = false;
    void controller.disable().then(() => (disabled = true));
    await tick(0);
    const waitsForSave = !disabled;
    calls[0].resolve(Response.json(view("7", "2026-10-13T01:00:00.000Z")));
    await tick(0);

    controller.edit();
    await tick(10_000);
    const flushed = await controller.flush();
    const whileDisabled = { disabled, calls: calls.length, status: controller.state().status, flushed };

    controller.enable();
    await tick(2000);
    const afterEnable = { calls: calls.length, method: calls[1]?.method };
    controller.dispose();

    expect({ waitsForSave, whileDisabled, afterEnable }).toEqual({
      waitsForSave: true,
      whileDisabled: { disabled: true, calls: 1, status: "dirty", flushed: false },
      afterEnable: { calls: 2, method: "PUT" },
    });
  });
});
