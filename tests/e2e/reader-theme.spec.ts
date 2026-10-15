import { expect, test } from "@playwright/test";

// 主题切换（reader-shell.md"主题切换"，US-01）
const toggle = (page: import("@playwright/test").Page) => page.getByRole("banner").getByRole("button", { name: /^主题：/ });
const bg = (page: import("@playwright/test").Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

// [TC-US01-02][SC-SHELL-02] 亮 / 暗翻转（圆形扩散）并跨页保持
test("[TC-US01-02] 主题翻转并跨页保持", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/posts");
  await expect(toggle(page)).toHaveAccessibleName("主题：亮色");
  // 记录切换期间是否出现过渡标记（支持 View Transitions 的浏览器才会有）
  await page.evaluate(() => {
    const w = window as unknown as { sawVt: boolean };
    w.sawVt = false;
    new MutationObserver(() => {
      if (document.documentElement.dataset.themeVt === "active") w.sawVt = true;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme-vt"] });
  });
  await toggle(page).click();
  await expect(toggle(page)).toHaveAccessibleName("主题：暗色");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const supportsVt = await page.evaluate(() => typeof document.startViewTransition === "function");
  expect(await page.evaluate(() => (window as unknown as { sawVt: boolean }).sawVt)).toBe(supportsVt);
  await expect(page.locator("html")).not.toHaveAttribute("data-theme-vt");
  expect(await bg(page)).toBe("rgb(33, 38, 43)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/posts/hello");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle(page)).toHaveAccessibleName("主题：暗色");
  await toggle(page).click();
  await expect(toggle(page)).toHaveAccessibleName("主题：亮色");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

// [TC-US01-02][SC-SHELL-02] 减少动效时直接切换，不出现过渡标记
test("[TC-US01-02] 减少动效时无扩散动画", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/posts");
  await expect(toggle(page)).toHaveAccessibleName("主题：亮色");
  const marked = await page.evaluate(async () => {
    const button = document.querySelector<HTMLButtonElement>("[data-theme-toggle]")!;
    button.click();
    return document.documentElement.dataset.themeVt ?? null;
  });
  expect(marked).toBeNull();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

// [TC-US01-03][SC-SHELL-03] 首屏即为已选主题（内联脚本在样式前设置）
test("[TC-US01-03] 首屏不闪主题", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  let themeAtDomReady: string | null = null;
  page.on("domcontentloaded", async () => {
    themeAtDomReady = await page.evaluate(() => document.documentElement.dataset.theme ?? null);
  });
  await page.goto("/posts/hello");
  await expect.poll(() => themeAtDomReady).toBe("dark");
  const inlineFirst = await page.evaluate(() => {
    const script = [...document.head.querySelectorAll("script")].find((s) => s.textContent?.includes("theme"));
    const firstStyle = document.head.querySelector('link[rel="stylesheet"], style');
    return !!script && !!firstStyle && !!(script.compareDocumentPosition(firstStyle) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(inlineFirst).toBe(true);
});

// [TC-US01-04][SC-SHELL-04] 跟随系统时随系统切换
test("[TC-US01-04] 跟随系统时随系统切换", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/posts");
  const light = await bg(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => bg(page)).not.toBe(light);
  await expect(toggle(page)).toHaveAccessibleName("主题：暗色");
});
