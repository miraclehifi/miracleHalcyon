import { afterEach, describe, expect, it, vi } from "vitest";
import { applyMode, bindThemeToggle, nextMode, readMode, THEME_LABELS } from "../../../src/lib/reader/theme-toggle";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

// [TC-US01-02][SC-SHELL-02][SC-SHELL-04] READER-UT-12、UT-201–204
describe("主题切换", () => {
  it("亮色 → 暗色 → 跟随系统 → 亮色", () => {
    expect([nextMode("light"), nextMode("dark"), nextMode("system")]).toEqual(["dark", "system", "light"]);
  });

  it("应用：亮 / 暗写入 data-theme，跟随系统时移除；写入存储；名称随之变化", () => {
    applyMode("dark");
    expect([document.documentElement.dataset.theme, localStorage.getItem("theme"), readMode()]).toEqual(["dark", "dark", "dark"]);
    applyMode("system");
    expect([document.documentElement.dataset.theme, readMode()]).toEqual([undefined, "system"]);
    expect(THEME_LABELS).toEqual({ light: "主题：亮色", dark: "主题：暗色", system: "主题：跟随系统" });
  });

  it("存储不可用时仍可切换，读取回退为跟随系统", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => applyMode("dark")).not.toThrow();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(readMode()).toBe("system");
  });

  it("按钮：初始化为存储中的模式，点击轮换并更新名称与 data-mode", () => {
    localStorage.setItem("theme", "light");
    document.body.innerHTML = '<button data-theme-toggle data-mode="system" aria-label="主题：跟随系统"></button>';
    const button = document.querySelector<HTMLButtonElement>("[data-theme-toggle]")!;
    bindThemeToggle(button);
    expect([button.dataset.mode, button.getAttribute("aria-label")]).toEqual(["light", "主题：亮色"]);
    button.click();
    expect([button.dataset.mode, button.getAttribute("aria-label"), document.documentElement.dataset.theme]).toEqual(["dark", "主题：暗色", "dark"]);
  });
});
