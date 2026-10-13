import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../../../src/components/ui/ConfirmDialog";

// ConfirmDialog（components.md"反馈组件"，admin-post-editor"模态框"）
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {})); // jsdom 无 WebGL（Button）
afterEach(cleanup);

function Page({ onCancel }: { onCancel: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
    onCancel();
  };
  return (
    <>
      <main data-testid="page">
        <button type="button" onClick={() => setOpen(true)}>删除文章</button>
      </main>
      <ConfirmDialog
        open={open}
        tone="danger"
        icon="trash-2"
        title="删除《我的 2026 年开发环境》？"
        description="删除后无法恢复。已发布的文章读者将无法再访问。"
        confirmLabel="确认删除"
        onConfirm={() => setOpen(false)}
        onCancel={close}
      />
    </>
  );
}

describe("ConfirmDialog", () => {
  it("背景 inert、初始焦点在取消、Tab 不出框、Esc / 点遮罩 = 取消、关闭后焦点回到触发按钮", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<Page onCancel={onCancel} />);
    const trigger = screen.getByRole("button", { name: "删除文章" });

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "删除《我的 2026 年开发环境》？" });
    const opened = {
      modal: dialog.getAttribute("aria-modal"),
      describedBy: document.getElementById(dialog.getAttribute("aria-describedby") ?? "")?.textContent,
      pageInert: screen.getByTestId("page").closest("[inert]") !== null,
      focused: document.activeElement?.textContent,
    };
    await user.tab();
    await user.tab();
    const focusAfterTabs = document.activeElement?.textContent;
    await user.keyboard("{Escape}");
    const afterEsc = { open: screen.queryByRole("dialog") !== null, focused: document.activeElement === trigger };

    await user.click(trigger);
    fireEvent.click(screen.getByTestId("confirm-dialog-scrim"));
    const afterScrim = {
      open: screen.queryByRole("dialog") !== null,
      focused: document.activeElement === trigger,
      pageInert: screen.getByTestId("page").closest("[inert]") !== null,
    };

    expect({ opened, focusAfterTabs, afterEsc, afterScrim, cancels: onCancel.mock.calls.length }).toEqual({
      opened: { modal: "true", describedBy: "删除后无法恢复。已发布的文章读者将无法再访问。", pageInert: true, focused: "取消" },
      focusAfterTabs: "取消",
      afterEsc: { open: false, focused: true },
      afterScrim: { open: false, focused: true, pageInert: false },
      cancels: 2,
    });
  });
});
