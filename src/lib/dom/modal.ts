// 模态弹窗共用（与 ConfirmDialog 同一做法）：打开时 body 下其余元素 inert；Tab 焦点限制在弹窗内
import type { KeyboardEvent } from "react";

// 把 body 下除弹窗外的元素设为 inert，返回恢复函数
export function makeBackgroundInert(host: HTMLElement): () => void {
  const changed = [...document.body.children].filter((el) => el !== host && !el.hasAttribute("inert"));
  changed.forEach((el) => el.setAttribute("inert", ""));
  return () => changed.forEach((el) => el.removeAttribute("inert"));
}

const FOCUSABLE = "button:not(:disabled), input:not(:disabled), a[href]";

// 在弹窗的 keydown 里调用：Tab / Shift+Tab 在弹窗内可聚焦元素间循环
export function trapTab(event: KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  if (event.key !== "Tab" || !container) return;
  const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)];
  if (focusable.length === 0) return;
  event.preventDefault();
  const index = focusable.indexOf(document.activeElement as HTMLElement);
  const step = event.shiftKey ? -1 : 1;
  focusable[(index + step + focusable.length) % focusable.length].focus();
}
