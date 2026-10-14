import type { Page } from "@playwright/test";

// 等页面上所有 React 岛真正完成水合后再交互。
// Astro 调用 hydrateRoot 后立即移除 ssr 属性，但 React 19 的水合是并发的，提交可能更晚；
// 提交前填入受控输入框的内容会被重置为组件状态（backlog: pre-hydration-input-loss）。
// 以 React 根 HostRoot.memoizedState.isDehydrated === false 作为"已提交"的判据（依赖 React 内部字段，升级 React 时复核）
export async function waitForHydration(page: Page) {
  await page.waitForFunction(() =>
    [...document.querySelectorAll("astro-island")].every((island) => {
      if (island.hasAttribute("ssr")) return false;
      const key = Object.keys(island).find((name) => name.startsWith("__reactContainer$"));
      if (!key) return false;
      const root = (island as unknown as Record<string, { stateNode?: { current?: { memoizedState?: { isDehydrated?: boolean } } } }>)[key];
      return root?.stateNode?.current?.memoizedState?.isDehydrated === false;
    }),
  );
}
