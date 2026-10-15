import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyScheme,
  bindThemeToggle,
  circleClipPath,
  currentScheme,
  readChoice,
  THEME_LABELS,
} from "../../../src/lib/reader/theme-toggle";

// matchMedia 替身：可切换系统配色 / 减少动效，并触发 change
function mockMedia({ dark = false, reduced = false } = {}) {
  const state = { dark, reduced };
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      get matches() {
        return query.includes("color-scheme") ? state.dark : query.includes("reduced-motion") ? state.reduced : false;
      },
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    })),
  );
  return {
    setDark(value: boolean) {
      state.dark = value;
      for (const fn of listeners) fn();
    },
  };
}

function mountButton() {
  document.body.innerHTML = '<button data-theme-toggle aria-label="主题：切换"></button>';
  return document.querySelector<HTMLButtonElement>("[data-theme-toggle]")!;
}

afterEach(() => {
  localStorage.clear();
  const root = document.documentElement;
  delete root.dataset.theme;
  delete root.dataset.themeVt;
  root.removeAttribute("style");
  document.body.innerHTML = "";
  Reflect.deleteProperty(document, "startViewTransition");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// [TC-US01-02][SC-SHELL-02][SC-SHELL-04] READER-UT-12、UT-201–204、UT-237
describe("主题切换", () => {
  it("UT-201 未选择时跟随系统；点击在暗色 / 亮色间翻转，写入 data-theme 与存储；旧值 system 视为未选择", () => {
    mockMedia({ dark: false });
    localStorage.setItem("theme", "system");
    expect([readChoice(), currentScheme()]).toEqual([null, "light"]);
    const button = mountButton();
    bindThemeToggle(button);
    expect(button.getAttribute("aria-label")).toBe("主题：亮色");
    button.click();
    expect([button.getAttribute("aria-label"), document.documentElement.dataset.theme, localStorage.getItem("theme")]).toEqual(["主题：暗色", "dark", "dark"]);
    button.click();
    expect([button.getAttribute("aria-label"), document.documentElement.dataset.theme, readChoice()]).toEqual(["主题：亮色", "light", "light"]);
    expect(THEME_LABELS).toEqual({ light: "主题：亮色", dark: "主题：暗色" });
  });

  it("UT-202 未选择时系统配色变化同步按钮名称；点过后固定为所选主题", () => {
    const media = mockMedia({ dark: false });
    const button = mountButton();
    bindThemeToggle(button);
    media.setDark(true);
    expect(button.getAttribute("aria-label")).toBe("主题：暗色");
    button.click();
    expect(document.documentElement.dataset.theme).toBe("light");
    media.setDark(false);
    media.setDark(true);
    expect(button.getAttribute("aria-label")).toBe("主题：亮色");
  });

  it("UT-203 存储不可用时仍可切换，读取视为未选择", () => {
    mockMedia();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => applyScheme("dark")).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(readChoice()).toBeNull();
  });

  it("UT-237 circleClipPath：以按钮中心为圆心，百分比坐标，终点半径覆盖最远角", () => {
    // 1000×500 视口、圆心 (900, 50)：最远角 (0, 500)，半径 hypot(900, 450)；百分比半径相对 hypot(w, h)/√2
    const [from, to] = circleClipPath(900, 50, 1000, 500);
    expect(from).toBe("circle(0% at 90% 10%)");
    const expected = (Math.hypot(900, 450) / (Math.hypot(1000, 500) / Math.SQRT2)) * 100;
    const radius = Number(/circle\(([\d.]+)% at 90% 10%\)/.exec(to)?.[1]);
    expect(radius).toBeCloseTo(expected, 6);
  });

  it("UT-237 支持 View Transitions：在过渡回调内切换，期间带过渡标记并忽略重复点击，结束后清理", async () => {
    mockMedia();
    let finish!: () => void;
    const finished = new Promise<void>((resolve) => (finish = resolve));
    const start = vi.fn((update: () => void) => {
      update();
      return { ready: Promise.resolve(), finished, updateCallbackDone: Promise.resolve() };
    });
    Object.assign(document, { startViewTransition: start });
    const animate = vi.fn(() => ({ cancel: vi.fn() }));
    document.documentElement.animate = animate as unknown as typeof document.documentElement.animate;
    const button = mountButton();
    bindThemeToggle(button);
    button.click();
    button.click();
    const root = document.documentElement;
    expect([start.mock.calls.length, root.dataset.theme, root.dataset.themeVt]).toEqual([1, "dark", "active"]);
    expect(root.style.getPropertyValue("--theme-vt-clip-from")).toMatch(/^circle\(0% at /);
    await Promise.resolve();
    expect(animate).toHaveBeenCalledWith(
      { clipPath: [expect.stringMatching(/^circle\(0% at /), expect.stringMatching(/^circle\([\d.]+% at /)] },
      expect.objectContaining({ duration: 400, pseudoElement: "::view-transition-new(root)" }),
    );
    finish();
    await finished;
    await Promise.resolve();
    expect([root.dataset.themeVt, root.style.getPropertyValue("--theme-vt-clip-from")]).toEqual([undefined, ""]);
  });

  it("UT-237 减少动效时直接切换，不启动过渡", () => {
    mockMedia({ reduced: true });
    const start = vi.fn();
    Object.assign(document, { startViewTransition: start });
    const button = mountButton();
    bindThemeToggle(button);
    button.click();
    expect([start.mock.calls.length, document.documentElement.dataset.theme, document.documentElement.dataset.themeVt]).toEqual([0, "dark", undefined]);
  });
});
