import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ImageSyntaxHelp } from "../../../src/components/admin/editor/ImageSyntaxHelp";
import { Popover } from "../../../src/components/ui/Popover";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// UT-139：写法帮助（admin-post-editor"图片写法说明"）
describe("ImageSyntaxHelp", () => {
  it("Popover：role=dialog、名称「图片写法」，打开时焦点在标题；5 个示例，不含 iPhone 导出说明；Esc 调用 onClose", () => {
    const onClose = vi.fn();
    render(
      <Popover open onClose={onClose} title="图片写法">
        <ImageSyntaxHelp />
      </Popover>,
    );
    const dialog = screen.getByRole("dialog", { name: "图片写法" });
    const rows = within(dialog)
      .getAllByRole("listitem")
      .map((row) => row.querySelector("code")?.textContent);
    const focused = document.activeElement?.textContent;
    fireEvent.keyDown(dialog, { key: "Escape" });

    expect({ rows, focused, iphone: /iPhone/.test(dialog.textContent ?? ""), liveNote: dialog.textContent?.includes("拖入安卓动态照片会自动生成"), closed: onClose.mock.calls.length }).toEqual({
      rows: ["![](url#wide)", "![](url#live)", '![](url "图注")', "连续几行只放图片", "组图首张加 #accordion"],
      focused: "图片写法",
      iphone: false,
      liveNote: true,
      closed: 1,
    });
  });

  it("复制按钮写入剪贴板（组图复制可直接粘贴的示例），图标变 ✓ 1.5 秒后复原", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<ImageSyntaxHelp />);
    const button = screen.getByRole("button", { name: "复制手风琴写法" });
    await act(async () => fireEvent.click(button));
    const copied = button.querySelector("svg")?.getAttribute("class");
    act(() => vi.advanceTimersByTime(1500));

    expect({ text: writeText.mock.calls[0], copied: copied?.includes("check"), after: button.querySelector("svg")?.getAttribute("class")?.includes("copy") }).toEqual({
      text: ["![](url#accordion)\n![](url)\n![](url)"],
      copied: true,
      after: true,
    });
  });
});
