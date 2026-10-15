// 主题切换（reader-shell.md"主题切换"、reader module-spec §3）：点击在亮 / 暗之间翻转（以当前实际配色为准），
// 写入 <html data-theme>；从未选择时不设，tokens.css 的 light-dark() 跟随 prefers-color-scheme。
// 切换动画：View Transitions 以按钮中心为圆心圆形扩散（移植自 Magic UI Animated Theme Toggler 的 circle 变体）
export type Scheme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const THEME_LABELS: Record<Scheme, string> = { light: "主题：亮色", dark: "主题：暗色" };
export const TRANSITION_MS = 400;

const DARK_SCHEME = "(prefers-color-scheme: dark)";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const matches = (query: string) => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false);

// 存储不可用（隐私模式、被禁用）或旧值 system 时视为未选择
export function readChoice(): Scheme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function currentScheme(root: HTMLElement = document.documentElement): Scheme {
  const forced = root.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return matches(DARK_SCHEME) ? "dark" : "light";
}

export function applyScheme(scheme: Scheme, root: HTMLElement = document.documentElement): void {
  root.dataset.theme = scheme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, scheme);
  } catch {
    // 只在本次会话生效
  }
}

// 起止 clip-path，坐标用视口百分比：Chrome 在 Windows 小数缩放下，::view-transition-new(root) 上的 px 坐标
// 首次过渡时不随缩放换算，会错位（Magic UI #989）。circle() 的百分比半径相对 hypot(w, h) / √2
export function circleClipPath(x: number, y: number, width: number, height: number): [string, string] {
  const at = `at ${(x / width) * 100}% ${(y / height) * 100}%`;
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  const percent = (radius / (Math.hypot(width, height) / Math.SQRT2)) * 100;
  return [`circle(0% ${at})`, `circle(${percent}% ${at})`];
}

function render(button: HTMLElement, scheme: Scheme) {
  button.setAttribute("aria-label", THEME_LABELS[scheme]);
}

function toggle(button: HTMLElement) {
  const root = document.documentElement;
  if (root.dataset.themeVt === "active") return;
  const next: Scheme = currentScheme(root) === "dark" ? "light" : "dark";
  const update = () => {
    applyScheme(next, root);
    render(button, next);
  };
  if (typeof document.startViewTransition !== "function" || matches(REDUCED_MOTION)) {
    update();
    return;
  }

  // innerWidth / innerHeight（含经典滚动条）：百分比相对快照参照框
  const { left, top, width, height } = button.getBoundingClientRect();
  const clipPath = circleClipPath(left + width / 2, top + height / 2, window.innerWidth, window.innerHeight);
  // 过渡样式只在本次切换期间生效（global.css），起始 clip-path 先用 CSS 固定，避免 Firefox 在动画开始前露出未裁剪的新主题
  root.dataset.themeVt = "active";
  root.style.setProperty("--theme-vt-duration", `${TRANSITION_MS}ms`);
  root.style.setProperty("--theme-vt-clip-from", clipPath[0]);
  let animation: Animation | null = null;
  const cleanup = () => {
    animation?.cancel();
    delete root.dataset.themeVt;
    root.style.removeProperty("--theme-vt-duration");
    root.style.removeProperty("--theme-vt-clip-from");
  };

  const transition = document.startViewTransition(update);
  transition.ready
    .then(() => {
      animation = root.animate(
        { clipPath },
        { duration: TRANSITION_MS, easing: "ease-in-out", fill: "forwards", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
  transition.finished.finally(cleanup).catch(() => {});
}

export function bindThemeToggle(button: HTMLElement): void {
  render(button, currentScheme());
  // 未选择时随系统变化；已选择时 currentScheme 取 data-theme，名称不变
  if (typeof window.matchMedia === "function") {
    window.matchMedia(DARK_SCHEME).addEventListener("change", () => render(button, currentScheme()));
  }
  button.addEventListener("click", () => toggle(button));
}
