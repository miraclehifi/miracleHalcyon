// 媒体查询与平台判断（订阅式，服务端渲染时取默认值，水合后按实际环境更新）
import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export const NARROW_QUERY = "(max-width: 767px)"; // 与 admin-post-editor"响应式"断点一致
export const COARSE_POINTER_QUERY = "(pointer: coarse)";

const noopSubscribe = () => () => {};

// 平台判断优先 userAgentData.platform，没有时用 navigator.platform（components.md"悬停提示参数"）
export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  return /mac/i.test(nav.userAgentData?.platform || nav.platform || "");
}

export function useIsMac(): boolean {
  return useSyncExternalStore(noopSubscribe, isMacPlatform, () => false);
}
