import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageMenu } from "../../../src/components/admin/editor/ImageMenu";

afterEach(cleanup);

function Harness({ onToggleWide }: { onToggleWide: () => void }) {
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  return (
    <ImageMenu
      kind="image"
      open={open}
      onOpenChange={setOpen}
      wide={wide}
      onToggleWide={() => {
        onToggleWide();
        setWide((value) => !value);
      }}
    />
  );
}

const trigger = () => screen.getByRole("button", { name: "图片选项" });
const wideItem = () => screen.getByRole("menuitemcheckbox", { name: "宽图" });

// UT-137（单图）、UT-138（菜单键盘）
describe("ImageMenu 单图", () => {
  it("menuitemcheckbox「宽图」：勾选状态随 wide；执行后菜单保持打开", () => {
    const onToggleWide = vi.fn();
    render(<Harness onToggleWide={onToggleWide} />);
    fireEvent.click(trigger());
    const before = { checked: wideItem().getAttribute("aria-checked"), expanded: trigger().getAttribute("aria-expanded"), menu: screen.getByRole("menu").getAttribute("aria-label") };
    fireEvent.click(wideItem());

    expect({ before, after: wideItem().getAttribute("aria-checked"), calls: onToggleWide.mock.calls.length, open: screen.queryByRole("menu") !== null }).toEqual({
      before: { checked: "false", expanded: "true", menu: "图片" },
      after: "true",
      calls: 1,
      open: true,
    });
  });

  it("Enter 打开后焦点在第一项；↓ 循环；Space 执行；Esc 关闭，焦点回到触发按钮；再点按钮关闭", () => {
    const onToggleWide = vi.fn();
    render(<Harness onToggleWide={onToggleWide} />);
    trigger().focus();
    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    const openedByArrow = document.activeElement === wideItem();
    fireEvent.keyDown(wideItem(), { key: "Escape" });
    fireEvent.click(trigger()); // Enter 在按钮上由浏览器转成 click
    const focusedFirst = document.activeElement === wideItem();
    fireEvent.keyDown(wideItem(), { key: "ArrowDown" });
    const cycled = document.activeElement === wideItem();
    fireEvent.keyDown(wideItem(), { key: " " });
    fireEvent.keyDown(wideItem(), { key: "Escape" });
    const afterEscape = { menu: screen.queryByRole("menu"), focus: document.activeElement === trigger() };
    fireEvent.click(trigger());
    fireEvent.pointerDown(trigger());
    fireEvent.click(trigger());

    expect({ openedByArrow, focusedFirst, cycled, calls: onToggleWide.mock.calls.length, afterEscape, toggledClosed: screen.queryByRole("menu") }).toEqual({
      openedByArrow: true,
      focusedFirst: true,
      cycled: true,
      calls: 1,
      afterEscape: { menu: null, focus: true },
      toggledClosed: null,
    });
  });
});
