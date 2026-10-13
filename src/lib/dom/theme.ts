// 主题与动效偏好的 React 订阅（客户端）；服务端渲染与不支持的环境返回默认值
import { useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const DARK_SCHEME = "(prefers-color-scheme: dark)";

function media(query: string): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query) : null;
}

function subscribeMedia(query: string, onChange: () => void): () => void {
  const list = media(query);
  list?.addEventListener("change", onChange);
  return () => list?.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => subscribeMedia(REDUCED_MOTION, onChange),
    () => media(REDUCED_MOTION)?.matches ?? false,
    () => false,
  );
}

// 主题切换：系统配色变化，或 <html data-theme> 被改写
function subscribeTheme(onChange: () => void): () => void {
  const unsubscribeMedia = subscribeMedia(DARK_SCHEME, onChange);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    unsubscribeMedia();
    observer.disconnect();
  };
}

// 把 CSS 颜色令牌解析成实际颜色（如 rgb(63, 63, 70)），供 canvas / WebGL 使用；解析不到时用 fallback
function resolveColor(token: string, fallback: string): string {
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = `var(--${token}, ${fallback})`;
  document.body.appendChild(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color || fallback;
}

const cache = new Map<string, string>();

export function useTokenColor(token: string, fallback: string): string {
  return useSyncExternalStore(
    (onChange) =>
      subscribeTheme(() => {
        cache.clear();
        onChange();
      }),
    () => {
      const key = `${token}|${fallback}`;
      if (!cache.has(key)) cache.set(key, resolveColor(token, fallback));
      return cache.get(key)!;
    },
    () => fallback,
  );
}
