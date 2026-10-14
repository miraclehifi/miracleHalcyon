// Tooltip / TooltipGroup（components.md"悬停提示参数"，design-tokens"悬停提示"）：底层为 React Bits WarmTooltip，
// 页面不直接引用 WarmTooltip。提示文字与按钮 aria-label 相同；shortcut 用键名数组（Mod = Mac ⌘ / 其他 Ctrl），
// 触屏（pointer: coarse）不显示键帽；触发按钮按 shortcut 写入 aria-keyshortcuts
import { cloneElement, type ReactElement, type ReactNode } from "react";
import { COARSE_POINTER_QUERY, useIsMac, useMediaQuery } from "../../lib/dom/media";
import WarmTooltip, { WarmTooltipGroup, type WarmTooltipSide } from "../vendor/react-bits/WarmTooltip";

export type ShortcutKey = "Mod" | "Shift" | string;

const MAC_SYMBOLS: Record<string, string> = { Mod: "⌘", Shift: "⇧" };
const PC_NAMES: Record<string, string> = { Mod: "Ctrl", Shift: "Shift" };
const ARIA_NAMES: Record<string, (isMac: boolean) => string> = { Mod: (isMac) => (isMac ? "Meta" : "Control"), Shift: () => "Shift" };

// Mac 按系统惯例 ⇧ 在 ⌘ 前；其他平台 Ctrl 在前
function ordered(keys: readonly ShortcutKey[], isMac: boolean): ShortcutKey[] {
  const rank = (key: ShortcutKey) => (isMac ? { Shift: 0, Mod: 1 } : { Mod: 0, Shift: 1 })[key as "Mod" | "Shift"] ?? 2;
  return [...keys].sort((a, b) => rank(a) - rank(b));
}

export function shortcutTokens(keys: readonly ShortcutKey[], isMac: boolean): string[] {
  return ordered(keys, isMac).map((key) => (isMac ? MAC_SYMBOLS : PC_NAMES)[key] ?? key.toUpperCase());
}

export function formatShortcut(keys: readonly ShortcutKey[], isMac: boolean): string {
  return shortcutTokens(keys, isMac).join(isMac ? "" : " ");
}

export function ariaKeyShortcuts(keys: readonly ShortcutKey[], isMac: boolean): string {
  return ordered(keys, false)
    .map((key) => ARIA_NAMES[key]?.(isMac) ?? key.toUpperCase())
    .join("+");
}

export function TooltipGroup({ children }: { children: ReactNode }) {
  return (
    <WarmTooltipGroup delay={400} warmWindow={300} travel={320} lean={0}>
      {children}
    </WarmTooltipGroup>
  );
}

export interface TooltipProps {
  content: string;
  shortcut?: readonly ShortcutKey[];
  side?: Extract<WarmTooltipSide, "top" | "bottom">;
  className?: string; // 加在触发包裹层上（如按钮只在某个断点显示时，包裹层一起隐藏）
  children: ReactElement<Record<string, unknown>>;
}

export function Tooltip({ content, shortcut, side = "bottom", className, children }: TooltipProps) {
  const isMac = useIsMac();
  const coarse = useMediaQuery(COARSE_POINTER_QUERY);
  const trigger = shortcut ? cloneElement(children, { "aria-keyshortcuts": ariaKeyShortcuts(shortcut, isMac) }) : children;

  return (
    <WarmTooltip
      content={content}
      shortcut={shortcut && !coarse ? shortcutTokens(shortcut, isMac) : undefined}
      side={side}
      surfaceColor="var(--color-ink)"
      inkColor="var(--color-bg)"
      size="md"
      radius={8}
      gap={8}
      arrow
      popDuration={160}
      popScale={0.94}
      popBlur={4}
      showFuse={false}
      longPress={500}
      className={className}
    >
      {trigger}
    </WarmTooltip>
  );
}
