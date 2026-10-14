import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Menu } from "../../../src/components/ui/Menu";

// Menu（components.md"基础组件"）：role="menu"，打开时焦点到第一项；↑ ↓ Home End 移动；Esc / Tab / 点外部关闭
afterEach(cleanup);

function Harness({ onSelect }: { onSelect: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  return (
    <>
      <button type="button" ref={triggerRef} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(true)}>
        更多操作
      </button>
      <p>外部</p>
      <Menu open={open} aria-label="更多操作" onClose={close}>
        <Menu.Item onSelect={() => onSelect("a")}>查看</Menu.Item>
        <Menu.Item disabled onSelect={() => onSelect("b")}>
          禁用项
        </Menu.Item>
        <Menu.Separator />
        <Menu.Item onSelect={() => onSelect("c")}>登出</Menu.Item>
      </Menu>
    </>
  );
}

describe("Menu", () => {
  it("焦点与键盘、选择与关闭", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    const trigger = screen.getByRole("button", { name: "更多操作" });
    const focused = () => document.activeElement?.textContent;

    fireEvent.click(trigger);
    const opened = { menu: screen.getByRole("menu", { name: "更多操作" }) !== null, focused: focused() };
    const keys: (string | undefined)[] = [];
    for (const key of ["ArrowDown", "ArrowDown", "ArrowUp", "End", "Home"]) {
      fireEvent.keyDown(document.activeElement!, { key });
      keys.push(focused());
    }
    fireEvent.click(screen.getByRole("menuitem", { name: "禁用项" }));
    const disabledClick = { open: screen.queryByRole("menu") !== null, calls: onSelect.mock.calls.length };
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    const afterEsc = { open: screen.queryByRole("menu") !== null, focusOnTrigger: document.activeElement === trigger };

    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByText("外部"));
    const afterOutside = screen.queryByRole("menu") !== null;

    fireEvent.click(trigger);
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    const afterSelect = { open: screen.queryByRole("menu") !== null, selected: onSelect.mock.calls.map(([name]) => name) };

    expect({ opened, keys, disabledClick, afterEsc, afterOutside, afterSelect }).toEqual({
      opened: { menu: true, focused: "查看" },
      keys: ["禁用项", "登出", "禁用项", "登出", "查看"], // 禁用项可聚焦（aria-disabled），↓ 在末项循环到首项
      disabledClick: { open: true, calls: 0 },
      afterEsc: { open: false, focusOnTrigger: true },
      afterOutside: false,
      afterSelect: { open: false, selected: ["c"] },
    });
  });
});
