import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeletePostAction } from "../../../src/components/admin/editor/PublishActions";
import { ToastProvider } from "../../../src/components/ui/Toast";

// 写文章页"删除文章"（admin-post-editor.md"设置抽屉""弹层与提示"，US-09）
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {})); // jsdom 无 WebGL（Button）
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const XSS_TITLE = "<img src=x onerror=alert(1)>";

function renderAction(title: string, hooks: { beforeDelete?: () => Promise<void>; onDeleted?: () => void; onFailed?: () => void } = {}) {
  return render(
    <ToastProvider>
      <DeletePostAction
        postId="7"
        title={title}
        beforeDelete={hooks.beforeDelete ?? (async () => {})}
        onDeleted={hooks.onDeleted ?? (() => {})}
        onFailed={hooks.onFailed ?? (() => {})}
      />
    </ToastProvider>,
  );
}

describe("DeletePostAction", () => {
  // [UT-110][UT-114][TC-US09-10][SC-DELETE-01] 确认框文案；标题含 HTML 时按纯文本显示
  it("确认框标题带文章标题、HTML 标题按文本显示", () => {
    renderAction(XSS_TITLE);
    fireEvent.click(screen.getByRole("button", { name: "删除文章" }));
    const dialog = screen.getByRole("alertdialog", { name: `删除《${XSS_TITLE}》？` });

    expect({
      description: dialog.querySelector(`#${CSS.escape(dialog.getAttribute("aria-describedby") ?? "")}`)?.textContent,
      injected: dialog.querySelector("img") !== null,
      confirm: screen.getByRole("button", { name: "确认删除" }).getAttribute("data-variant"),
    }).toEqual({ description: "删除后无法恢复。已发布的文章读者将无法再访问。", injected: false, confirm: "danger" });
  });

  // [TC-US09-02][SC-DELETE-02] 先暂停自动保存，再 DELETE 一次，成功后交给页面跳转
  it("确认后先暂停自动保存再发 DELETE，成功回调 onDeleted", async () => {
    const order: string[] = [];
    const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
      order.push(`${init?.method} ${String(input)}`);
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);
    renderAction("Old Post", { beforeDelete: async () => void order.push("beforeDelete"), onDeleted: () => order.push("onDeleted") });

    fireEvent.click(screen.getByRole("button", { name: "删除文章" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "确认删除" })));

    expect(order).toEqual(["beforeDelete", "DELETE /api/admin/posts/7", "onDeleted"]);
  });

  // [TC-US09-05][SC-DELETE-06] 500 / 网络失败：提示"删除失败，请重试"，关闭确认框，不跳转，页面恢复自动保存
  it("删除失败时提示并关闭确认框，回调 onFailed", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>(async () => new Response("oops", { status: 500 })));
    const onDeleted = vi.fn();
    const onFailed = vi.fn();
    renderAction("Old Post", { onDeleted, onFailed });

    fireEvent.click(screen.getByRole("button", { name: "删除文章" }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "确认删除" })));

    expect({
      alert: screen.getByRole("alert").textContent?.includes("删除失败，请重试"),
      dialogOpen: screen.queryByRole("alertdialog") !== null,
      onDeleted: onDeleted.mock.calls.length,
      onFailed: onFailed.mock.calls.length,
    }).toEqual({ alert: true, dialogOpen: false, onDeleted: 0, onFailed: 1 });
  });
});
