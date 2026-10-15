import { expect, test, type Page } from "@playwright/test";

// 阅读进度、目录与窄屏目录抽屉（reader-post-detail.md"右栏""手机 / 窄屏"，US-08）。数据：reader-fixture 的 hello
const toc = (page: Page) => page.getByRole("navigation", { name: "目录" }).filter({ visible: true });
const progress = (page: Page) => page.getByRole("progressbar", { name: "阅读进度" }).filter({ visible: true });

// [TC-US08-01][TC-US08-08][SC-SIDEBAR-01][SC-SIDEBAR-08] 宽屏右栏：进度与 5 项目录；无标题时只有进度
test("[TC-US08-01][TC-US08-08] 宽屏右栏目录与进度", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/posts/hello");
  await expect(progress(page)).toHaveAttribute("aria-valuenow", "0");
  await expect(toc(page).getByRole("link")).toHaveText(["安装", "依赖", "配置", "环境变量", "结语"]);
  const paper = (await page.locator("article").first().boundingBox())!;
  expect((await toc(page).boundingBox())!.x).toBeGreaterThan(paper.x + paper.width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await page.goto("/posts/first-post");
  await expect(toc(page)).toHaveCount(0);
  await expect(progress(page)).toBeVisible();
});

// [TC-US08-04][SC-SIDEBAR-04] 阅读进度随滚动变化
test("[TC-US08-04] 阅读进度", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/posts/hello");
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(progress(page)).toHaveAttribute("aria-valuenow", "100");
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(progress(page)).toHaveAttribute("aria-valuenow", "0");
});

// [TC-US08-05][TC-US08-06][SC-SIDEBAR-05][SC-SIDEBAR-06] 目录高亮与点击跳转；减弱动效直接跳
test("[TC-US08-05][TC-US08-06] 目录高亮与跳转", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/posts/hello");
  await toc(page).getByRole("link", { name: "结语" }).click();
  await expect(page).toHaveURL(/#%E7%BB%93%E8%AF%AD$/);
  const top = await page.locator("#结语").evaluate((el) => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(120);
  await expect(toc(page).getByRole("link", { name: "结语" })).toHaveAttribute("aria-current", "true");
  await expect(toc(page).locator("[aria-current]")).toHaveCount(1);
});

// [TC-US08-07][SC-SIDEBAR-07][SC-SIDEBAR-09] 窄屏：进度细条、目录按钮与抽屉
test("[TC-US08-07] 窄屏目录抽屉", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/posts/hello");
  await expect(progress(page)).toBeVisible();
  const button = page.getByRole("button", { name: "目录" });
  const box = (await button.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  await button.click();
  const drawer = page.getByRole("dialog", { name: "目录" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link")).toHaveCount(5);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(button).toBeFocused();
  await button.click();
  await drawer.getByRole("link", { name: "配置" }).click();
  await expect(drawer).toBeHidden();
  await expect(page).toHaveURL(/#%E9%85%8D%E7%BD%AE$/);
});
