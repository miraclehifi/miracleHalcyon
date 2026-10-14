// 预览挂载复用（markdown module-spec §1 ImageRef，US-12 BH-13）：两次渲染之间按"src + 标记"配对图片实例，
// 相同的复用原 DOM 与组件状态（不重新请求、不重播马赛克），其余重新挂载，多出的卸载。alt、图注、源码位置变化只更新 props
import type { ImageRef } from "./render";

export interface IslandReconcile {
  matches: (number | null)[]; // 下标对应 next：复用的 prev 下标，null 为新挂载
  removed: number[]; // 未被复用的 prev 下标（升序），需要卸载
}

export const islandKey = ({ src, marks }: Pick<ImageRef, "src" | "marks">): string =>
  `${src}#${marks.wide ? "w" : ""}${marks.live ? "l" : ""}${marks.accordion ? "a" : ""}`;

// 同一 key 出现多次时按出现顺序一一对应
export function reconcileIslands(prev: readonly string[], next: readonly string[]): IslandReconcile {
  const pool = new Map<string, number[]>();
  prev.forEach((key, i) => pool.set(key, [...(pool.get(key) ?? []), i]));
  const matches = next.map((key) => pool.get(key)?.shift() ?? null);
  const reused = new Set(matches);
  return { matches, removed: prev.map((_, i) => i).filter((i) => !reused.has(i)) };
}
