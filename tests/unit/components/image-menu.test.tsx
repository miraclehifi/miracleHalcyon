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

// UT-137（组图）
describe("ImageMenu 组图", () => {
  const renderGallery = (count: number, mode: "grid" | "accordion" = "grid") => {
    const onModeChange = vi.fn();
    const onSplit = vi.fn();
    render(<ImageMenu kind="gallery" open onOpenChange={() => {}} mode={mode} count={count} onModeChange={onModeChange} onSplit={onSplit} />);
    return { onModeChange, onSplit };
  };
  const state = () =>
    [...screen.getByRole("menu").querySelectorAll('[role^="menuitem"]')].map((item) => [item.getAttribute("role"), item.textContent, item.getAttribute("aria-checked"), item.getAttribute("aria-disabled")]);

  it("网格 / 手风琴为 radio、当前形态勾选，分隔线后为「拆成单图」；3–7 张手风琴可用", () => {
    const { onModeChange } = renderGallery(3, "accordion");
    const items = state();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "网格" }));
    expect({ trigger: screen.getByRole("button", { name: "组图选项" }) !== null, menu: screen.getByRole("menu").getAttribute("aria-label"), items, separator: screen.getAllByRole("separator").length, calls: onModeChange.mock.calls }).toEqual({
      trigger: true,
      menu: "组图",
      items: [
        ["menuitemradio", "网格", "false", null],
        ["menuitemradio", "手风琴", "true", null],
        ["menuitem", "拆成单图", null, null],
      ],
      separator: 1,
      calls: [["grid"]],
    });
  });

  it("张数不在 3–7 时手风琴 aria-disabled，点击不触发；拆成单图触发 onSplit", () => {
    const results = [2, 7, 8].map((count) => {
      const { onModeChange, onSplit } = renderGallery(count);
      fireEvent.click(screen.getByRole("menuitemradio", { name: "手风琴" }));
      fireEvent.click(screen.getByRole("menuitem", { name: "拆成单图" }));
      const result = { disabled: screen.getByRole("menuitemradio", { name: "手风琴" }).getAttribute("aria-disabled"), mode: onModeChange.mock.calls.length, split: onSplit.mock.calls.length };
      cleanup();
      return result;
    });
    expect(results).toEqual([
      { disabled: "true", mode: 0, split: 1 },
      { disabled: null, mode: 1, split: 1 },
      { disabled: "true", mode: 0, split: 1 },
    ]);
  });
});
