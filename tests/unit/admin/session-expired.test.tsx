import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostEditorPage } from "../../../src/components/admin/editor/PostEditorPage";
import type { PostView } from "../../../src/domains/post/service";
import { readLocalDraft } from "../../../src/lib/autosave/local-draft";
import { navigate } from "../../../src/lib/dom/navigate";

vi.mock("../../../src/lib/dom/navigate", () => ({ navigate: vi.fn() }));

// jsdom 没有 Web Worker：预览区的渲染 Worker 换成空实现
class StubWorker {
  addEventListener() {}
  postMessage() {}
  terminate() {}
}

// 会话过期（editor module-spec §2 状态机 401、UI 决定 #3）：先暂存本地，再跳登录页，next 为当前地址
beforeEach(() => {
  vi.stubGlobal("Worker", StubWorker);
  vi.spyOn(console, "error").mockImplementation(() => {}); // jsdom 无 WebGL（Button）
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  localStorage.clear();
  vi.mocked(navigate).mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const POST: PostView = {
  id: "7",
  title: "T",
  slug: "t",
  tags: [],
  summary: "",
  body: "基线",
  status: "draft",
  hasUnpublishedChanges: false,
  publishedAt: "2026-10-10",
  lastPublishedAt: null,
  cover: null,
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
};

const unauthenticated = () => Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 });

describe("写文章页会话过期", () => {
  // [UT-63][TC-US06-18][SC-AUTOSAVE-10] 自动保存 401 → 暂存当前内容 → 跳 /admin/login?next=/admin/posts/7，不弹离开确认
  it("自动保存 401 时暂存并跳转登录页", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => unauthenticated()));
    window.history.replaceState(null, "", "/admin/posts/7");
    render(<PostEditorPage initial={POST} />);

    fireEvent.change(screen.getByRole("textbox", { name: "正文" }), { target: { value: "基线+过期后输入" } });
    await act(() => vi.advanceTimersByTimeAsync(2000));
    const leave = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(leave);

    expect({ navigate: vi.mocked(navigate).mock.calls, stash: readLocalDraft("7")?.content.body, leaveBlocked: leave.defaultPrevented }).toEqual({
      navigate: [["/admin/login?next=%2Fadmin%2Fposts%2F7"]],
      stash: "基线+过期后输入",
      leaveBlocked: false,
    });
  });

  // [TC-US06-25][SC-AUTOSAVE-10] 发布返回 401 同样处理（新建页地址为 /admin/posts/new 时 next 也是它）
  it("发布 401 时暂存并跳转登录页", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async (_input, init) => (init?.method === "PUT" ? Response.json({ ...POST, body: "基线!" }) : unauthenticated())));
    window.history.replaceState(null, "", "/admin/posts/7");
    render(<PostEditorPage initial={POST} />);

    fireEvent.change(screen.getByRole("textbox", { name: "正文" }), { target: { value: "基线!" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "发布" })));
    await act(() => vi.advanceTimersByTimeAsync(0));

    expect({ navigate: vi.mocked(navigate).mock.calls, stash: readLocalDraft("7")?.content.body }).toEqual({
      navigate: [["/admin/login?next=%2Fadmin%2Fposts%2F7"]],
      stash: "基线!",
    });
  });
});
