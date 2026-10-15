import { expect, test } from "@playwright/test";

// 主题切换（reader-shell.md"主题切换"，US-01）
const toggle = (page: import("@playwright/test").Page) => page.getByRole("banner").getByRole("button", { name: /^主题：/ });
const bg = (page: import("@playwright/test").Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

// [TC-US01-02][SC-SHELL-02] 三态轮换并跨页保持
test("[TC-US01-02] 主题三态轮换并跨页保持", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/posts");
  await expect(toggle(page)).toHaveAccessibleName("主题：跟随系统");
  await toggle(page).click();
  await expect(toggle(page)).toHaveAccessibleName("主题：亮色");
  await toggle(page).click();
  await expect(toggle(page)).toHaveAccessibleName("主题：暗色");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bg(page)).toBe("rgb(33, 38, 43)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("/posts/hello");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle(page)).toHaveAccessibleName("主题：暗色");
  await toggle(page).click();
  await expect(toggle(page)).toHaveAccessibleName("主题：跟随系统");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
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
  await expect(toggle(page)).toHaveAccessibleName("主题：跟随系统");
});
