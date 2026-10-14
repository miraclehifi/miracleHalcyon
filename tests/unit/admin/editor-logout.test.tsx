import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostEditorPage } from "../../../src/components/admin/editor/PostEditorPage";
import type { PostView } from "../../../src/domains/post/service";
import { readLocalDraft } from "../../../src/lib/autosave/local-draft";
import { navigate } from "../../../src/lib/dom/navigate";

vi.mock("../../../src/lib/dom/navigate", () => ({ navigate: vi.fn() }));

class StubWorker {
  addEventListener() {}
  postMessage() {}
  terminate() {}
}

// 写文章页"更多"菜单 → 登出（admin-post-editor"顶栏"，US-02）
beforeEach(() => {
  vi.stubGlobal("Worker", StubWorker);
  vi.spyOn(console, "error").mockImplementation(() => {}); // jsdom 无 WebGL（Button）
  localStorage.clear();
  vi.mocked(navigate).mockClear();
});
afterEach(() => {
  cleanup();
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
  createdAt: "2026-10-10T00:00:00.000Z",
  updatedAt: "2026-10-10T00:00:00.000Z",
};

const logoutCalls = (fetchMock: ReturnType<typeof vi.fn>) => fetchMock.mock.calls.filter(([url]) => String(url) === "/api/admin/logout").length;
// 菜单要先渲染出来再点（在 act 回调里连续触发时，React 会把重新渲染推迟到回调结束）
const openMenuAndLogout = async () => {
  fireEvent.click(screen.getByRole("button", { name: "更多操作" }));
  await act(async () => fireEvent.click(screen.getByRole("menuitem", { name: "登出" })));
};

describe("写文章页登出", () => {
  // [TC-US02-15][SC-LOGOUT-01] 没有未保存修改：直接 POST 登出并跳登录页
  it("无未保存修改直接登出", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PostEditorPage initial={POST} />);

    await openMenuAndLogout();

    expect({ dialog: screen.queryByRole("alertdialog") !== null, logout: logoutCalls(fetchMock), navigate: vi.mocked(navigate).mock.calls }).toEqual({
      dialog: false,
      logout: 1,
      navigate: [["/admin/login"]],
    });
  });

  // [TC-US02-13][TC-US02-14][SC-LOGOUT-03] 有未保存修改：先确认；取消不登出；确认后暂存当前内容再登出（401 也按已登出处理）
  it("有未保存修改时确认", async () => {
    const fetchMock = vi.fn(async () => Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PostEditorPage initial={POST} />);
    fireEvent.change(screen.getByRole("textbox", { name: "正文" }), { target: { value: "基线+未保存" } });

    await openMenuAndLogout();
    const dialog = screen.getByRole("alertdialog", { name: "有未保存的修改，确定登出吗？" });
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    const cancelled = { open: screen.queryByRole("alertdialog") !== null, logout: logoutCalls(fetchMock), body: (screen.getByRole("textbox", { name: "正文" }) as HTMLTextAreaElement).value };

    await openMenuAndLogout();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "登出" })));

    expect({
      description: dialog.textContent?.includes("未保存的内容会暂存在本机，下次打开这篇文章时可以恢复。"),
      cancelled,
      logout: logoutCalls(fetchMock),
      stash: readLocalDraft("7")?.content.body,
      navigate: vi.mocked(navigate).mock.calls,
    }).toEqual({
      description: true,
      cancelled: { open: false, logout: 0, body: "基线+未保存" },
      logout: 1,
      stash: "基线+未保存",
      navigate: [["/admin/login"]],
    });
  });
});
