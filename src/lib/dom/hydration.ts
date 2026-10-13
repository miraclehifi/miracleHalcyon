// 是否已在客户端完成水合：服务端渲染与水合时为 false，之后为 true（不需要 effect 里 setState）
import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
