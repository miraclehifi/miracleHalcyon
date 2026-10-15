// 主题切换（reader-shell.md"主题切换"、reader module-spec §3）：亮色 → 暗色 → 跟随系统；
// 亮 / 暗写入 <html data-theme>，跟随系统时移除（tokens.css 的 light-dark() 跟随 prefers-color-scheme）
export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";
export const THEME_LABELS: Record<ThemeMode, string> = { light: "主题：亮色", dark: "主题：暗色", system: "主题：跟随系统" };

const ORDER: ThemeMode[] = ["light", "dark", "system"];

export const nextMode = (mode: ThemeMode): ThemeMode => ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];

// 存储不可用（隐私模式、被禁用）时视为跟随系统
export function readMode(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function applyMode(mode: ThemeMode, root: HTMLElement = document.documentElement): void {
  if (mode === "system") delete root.dataset.theme;
  else root.dataset.theme = mode;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // 只在本次会话生效
  }
}

function render(button: HTMLElement, mode: ThemeMode) {
  button.dataset.mode = mode;
  button.setAttribute("aria-label", THEME_LABELS[mode]);
}

export function bindThemeToggle(button: HTMLElement): void {
  render(button, readMode());
  button.addEventListener("click", () => {
    const mode = nextMode((button.dataset.mode as ThemeMode) ?? "system");
    applyMode(mode);
    render(button, mode);
  });
}
