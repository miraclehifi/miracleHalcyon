import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DraftInput } from "../../../src/domains/post/content";
import { createAutosaveController } from "../../../src/lib/autosave/controller";
import { clearLocalDraft, compareLocalStash, createLocalDraftStash, readLocalDraft, writeLocalDraft } from "../../../src/lib/autosave/local-draft";

// 本地暂存（editor module-spec §2"本地暂存""恢复判断"）：localStorage['mh:draft:{id|new}'] = { savedAt, content }
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-10T06:35:00.000Z"));
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const CONTENT: DraftInput = { title: "T", slug: "t", tags: [], summary: "", body: "本地版本", publishedAt: null };
const SERVER = { updatedAt: "2026-10-10T06:34:00.000Z", content: { ...CONTENT, body: "服务端版本" } };

describe("compareLocalStash", () => {
  // [UT-78][SC-AUTOSAVE-07] 严格更新且内容不同才提示；更旧 / 相等 / 内容相同丢弃；无暂存 none
  it("按时间与内容判定", () => {
    const stash = (savedAt: string, content = CONTENT) => ({ savedAt, content });
    expect({
      newer: compareLocalStash(stash("2026-10-10T06:34:00.001Z"), SERVER),
      equalTime: compareLocalStash(stash("2026-10-10T06:34:00.000Z"), SERVER),
      older: compareLocalStash(stash("2026-10-10T06:33:00.000Z"), SERVER),
      sameContent: compareLocalStash(stash("2026-10-10T06:40:00.000Z", SERVER.content), SERVER),
      none: compareLocalStash(null, SERVER),
      newPost: compareLocalStash(stash("2026-10-10T06:40:00.000Z"), null),
      newPostEmpty: compareLocalStash(stash("2026-10-10T06:40:00.000Z", { ...CONTENT, title: "", slug: "", body: " " }), null),
    }).toEqual({ newer: "promptRestore", equalTime: "discard", older: "discard", sameContent: "discard", none: "none", newPost: "promptRestore", newPostEmpty: "discard" });
  });

  // [UT-78] 损坏的暂存（非法 JSON / 结构不对）读出为 null，不抛错；localStorage 不可用时读写都不抛错
  it("损坏或不可用时安全降级", () => {
    localStorage.setItem("mh:draft:7", "{oops");
    localStorage.setItem("mh:draft:8", JSON.stringify({ savedAt: 1, content: "x" }));
    const corrupt = [readLocalDraft("7"), readLocalDraft("8")];
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect({ corrupt, read: readLocalDraft("7"), write: () => writeLocalDraft("7", CONTENT), clear: () => clearLocalDraft("7") }).toMatchObject({ corrupt: [null, null], read: null });
    expect(() => writeLocalDraft("7", CONTENT)).not.toThrow();
  });
});

// 可控的 fetch（同 autosave.test.ts）
function controllableFetch() {
  const calls: { resolve(response: Response): void; reject(error: Error): void }[] = [];
  const fetchMock = vi.fn<typeof fetch>(() => new Promise<Response>((resolve, reject) => calls.push({ resolve, reject })));
  return { fetchMock, calls };
}
const view = (id: string, updatedAt: string) => ({ ...CONTENT, id, status: "draft", hasUnpublishedChanges: false, lastPublishedAt: null, createdAt: updatedAt, updatedAt });

describe("自动保存写本地暂存", () => {
  // [UT-76][SC-AUTOSAVE-06] 编辑后 500ms 内写入暂存（节流）；网络失败时暂存保留；重试成功后清除
  it("编辑即暂存，失败保留，成功清除", async () => {
    const { fetchMock, calls } = controllableFetch();
    let body = "a";
    const controller = createAutosaveController({ postId: "7", getContent: () => ({ ...CONTENT, body }), fetch: fetchMock, stash: createLocalDraftStash() });

    controller.edit();
    await vi.advanceTimersByTimeAsync(0);
    const first = readLocalDraft("7")?.content.body;
    body = "ab";
    controller.edit();
    await vi.advanceTimersByTimeAsync(499);
    const throttled = readLocalDraft("7")?.content.body;
    await vi.advanceTimersByTimeAsync(1);
    const written = readLocalDraft("7");
    await vi.advanceTimersByTimeAsync(1500); // 第二次编辑后 2 秒防抖到期，PUT
    calls[0].reject(new TypeError("Failed to fetch"));
    await vi.advanceTimersByTimeAsync(0);
    const afterFailure = readLocalDraft("7")?.content.body;
    await vi.advanceTimersByTimeAsync(2000);
    calls[1].resolve(Response.json(view("7", "2026-10-10T06:35:03.000Z")));
    await vi.advanceTimersByTimeAsync(0);
    controller.dispose();

    expect({ first, throttled, written, afterFailure, afterSuccess: readLocalDraft("7") }).toEqual({
      first: "a", // 第一次编辑下一轮事件循环即写
      throttled: "a", // 500ms 内的编辑合并到一次
      written: { savedAt: "2026-10-10T06:35:00.500Z", content: { ...CONTENT, body: "ab" } },
      afterFailure: "ab",
      afterSuccess: null,
    });
  });

  // 新建页写 mh:draft:new；首次创建成功后清除 new，之后写 mh:draft:{id}
  it("新建文章的暂存迁到 id", async () => {
    const { fetchMock, calls } = controllableFetch();
    let body = "x";
    const controller = createAutosaveController({ postId: null, getContent: () => ({ ...CONTENT, body }), fetch: fetchMock, stash: createLocalDraftStash() });
    controller.edit();
    await vi.advanceTimersByTimeAsync(0);
    const beforeCreate = readLocalDraft(null)?.content.body;
    await vi.advanceTimersByTimeAsync(2000);
    body = "xy";
    controller.edit(); // 保存中又编辑
    calls[0].resolve(Response.json(view("9", "2026-10-10T06:35:02.000Z"), { status: 201 }));
    await vi.advanceTimersByTimeAsync(600);
    const after = { fresh: readLocalDraft(null), byId: readLocalDraft("9")?.content.body };
    controller.dispose();

    expect({ beforeCreate, after }).toEqual({ beforeCreate: "x", after: { fresh: null, byId: "xy" } });
  });
});
