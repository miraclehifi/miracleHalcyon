// 格式快捷键（admin-post-editor.md"工具栏与悬停提示"，UT-119）：Mod = Mac 上 ⌘、其他平台 Ctrl；
// 带 Shift 的按 code 判断（Shift+8 的 key 是 "*"，Shift+. 是 ">"）；输入法组字期间不触发
import type { FormatCommand } from "./format-commands";

export type ShortcutEvent = Pick<KeyboardEvent, "key" | "code" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "isComposing">;

const PLAIN: Record<string, FormatCommand> = { b: "bold", i: "italic", k: "link", e: "code" };
const SHIFTED: Record<string, FormatCommand> = { Digit8: "list", Period: "quote" };

export function matchShortcut(event: ShortcutEvent, isMac: boolean): FormatCommand | null {
  if (event.isComposing || event.altKey) return null;
  const mod = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!mod) return null;
  return (event.shiftKey ? SHIFTED[event.code] : PLAIN[event.key.toLowerCase()]) ?? null;
}

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac/i.test(nav.userAgentData?.platform || nav.platform || "");
}
