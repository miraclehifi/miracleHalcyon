import { describe, expect, it } from "vitest";
import { ariaKeyShortcuts, formatShortcut, shortcutTokens } from "../../../src/components/ui/Tooltip";

// [SC-TOOLBAR-07] UT-120：键帽文案按平台；aria-keyshortcuts 用标准键名
describe("快捷键文案", () => {
  it("Mac 用符号且不留空（⇧ 在 ⌘ 前），其他平台用 Ctrl / Shift 并以空格分隔", () => {
    expect({
      mac: [formatShortcut(["Mod", "B"], true), formatShortcut(["Mod", "Shift", "8"], true), formatShortcut(["Mod", "Shift", "."], true)],
      win: [formatShortcut(["Mod", "B"], false), formatShortcut(["Mod", "Shift", "8"], false)],
      tokens: [shortcutTokens(["Mod", "Shift", "8"], true), shortcutTokens(["Mod", "Shift", "8"], false)],
      aria: [ariaKeyShortcuts(["Mod", "B"], true), ariaKeyShortcuts(["Mod", "Shift", "8"], false)],
    }).toEqual({
      mac: ["⌘B", "⇧⌘8", "⇧⌘."],
      win: ["Ctrl B", "Ctrl Shift 8"],
      tokens: [["⇧", "⌘", "8"], ["Ctrl", "Shift", "8"]],
      aria: ["Meta+B", "Control+Shift+8"],
    });
  });
});
