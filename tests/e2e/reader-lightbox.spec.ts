import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 灯箱（reader-post-detail.md"图片与灯箱"，US-10）。数据：reader-fixture 的 hello——
// 1 单图（图注一）、2 宽图、3–5 网格、6–10 手风琴（默认展开第 8 张）、11 实况、12 缺失图片
const content = (page: Page) => page.locator("#article-content");
const lightbox = (page: Page) => page.getByRole("dialog", { name: "图片查看" });
const counter = (page: Page) => lightbox(page).locator("[data-lightbox-counter]");

async function openHello(page: Page, width = 1440, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto("/posts/hello");
  await waitForHydration(page);
}

// [TC-US10-03][SC-LIGHTBOX-02] 点击单图打开：模态、计数、图注、背景不滚动
test("[TC-US10-03] 点击单图打开灯箱", async ({ page }) => {
  await openHello(page);
  await content(page).getByRole("button", { name: "查看大图：山" }).click();
  await expect(lightbox(page)).toHaveAttribute("aria-modal", "true");
  await expect(counter(page)).toHaveText("1 / 12");
  await expect(lightbox(page)).toContainText("图注一");
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

// [TC-US10-04][SC-LIGHTBOX-03] 网格单元格与手风琴：未展开项只展开，已展开项打开灯箱
test("[TC-US10-04] 网格与手风琴中的点击", async ({ page }) => {
  await openHello(page);
  await content(page).locator('figure[data-image-gallery="grid"] [data-gallery-item]').nth(1).click();
  await expect(counter(page)).toHaveText("4 / 12");
  await page.keyboard.press("Escape");
  await expect(lightbox(page)).toBeHidden();

  // 桌面：手风琴悬停即展开（trigger: hover），点击时已是展开项 → 打开灯箱
  const panels = content(page).locator('figure[data-image-gallery="accordion"] [role=listitem]');
  await panels.first().scrollIntoViewIfNeeded();
  await panels.first().hover();
  await page.waitForTimeout(800);
  await panels.first().click();
  await expect(counter(page)).toHaveText("6 / 12");
});

// [TC-US10-04][SC-LIGHTBOX-03] 触屏：轻点未展开项只展开，再点已展开项才打开灯箱
test("[TC-US10-04] 触屏手风琴先展开再打开", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/posts/hello");
  await waitForHydration(page);
  const panels = content(page).locator('figure[data-image-gallery="accordion"] [role=listitem]');
  await panels.first().scrollIntoViewIfNeeded();
  await panels.first().tap();
  await page.waitForTimeout(800);
  await expect(lightbox(page)).toHaveCount(0);
  await panels.first().tap();
  await expect(counter(page)).toHaveText("6 / 12");
  await context.close();
});

// [TC-US10-05][TC-US10-06][SC-LIGHTBOX-04][SC-LIGHTBOX-05] 键盘、按钮、滑动切换；首尾边界
test("[TC-US10-05][TC-US10-06] 切换与首尾边界", async ({ page }) => {
  await openHello(page);
  await content(page).getByRole("button", { name: "查看大图：山" }).click();
  await expect(lightbox(page).getByRole("button", { name: "上一张" })).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await expect(counter(page)).toHaveText("1 / 12");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(counter(page)).toHaveText("3 / 12");
  await lightbox(page).getByRole("button", { name: "上一张" }).click();
  await expect(counter(page)).toHaveText("2 / 12");
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
  await expect(counter(page)).toHaveText("12 / 12");
  await expect(lightbox(page).getByRole("button", { name: "下一张" })).toBeDisabled();
});

// [TC-US10-07][SC-LIGHTBOX-06] 键盘打开、Esc / 关闭按钮 / 点遮罩关闭，焦点回到图片
test("[TC-US10-07] 关闭灯箱焦点回原图", async ({ page }) => {
  await openHello(page);
  const first = content(page).getByRole("button", { name: "查看大图：山" });
  const reopen = async () => {
    await first.focus();
    await page.keyboard.press("Enter");
    await expect(lightbox(page)).toBeVisible();
  };
  await reopen();
  await page.keyboard.press("Escape");
  await expect(lightbox(page)).toBeHidden();
  await expect(first).toBeFocused();

  await reopen();
  await lightbox(page).getByRole("button", { name: "关闭" }).click();
  await expect(lightbox(page)).toBeHidden();
  await expect(first).toBeFocused();

  await reopen();
  await lightbox(page).click({ position: { x: 20, y: 300 } });
  await expect(lightbox(page)).toBeHidden();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

// [TC-US10-07][SC-LIGHTBOX-06] 手机下滑关闭；不足阈值回弹
test("[TC-US10-07] 手机下滑关闭灯箱", async ({ page }) => {
  await openHello(page, 390, 844);
  await content(page).getByRole("button", { name: "查看大图：山" }).click();
  const stage = lightbox(page).locator("[data-lightbox-stage]");
  const box = (await stage.boundingBox())!;
  const drag = async (dy: number) => {
    await page.mouse.move(box.x + box.width / 2, box.y + 100);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width / 2, box.y + 100 + (dy * i) / 10);
    await page.waitForTimeout(400);
    await page.mouse.up();
  };
  await drag(40);
  await expect(lightbox(page)).toBeVisible();
  await drag(180);
  await expect(lightbox(page)).toBeHidden();
});

// [TC-US10-12][SC-LIGHTBOX-02] 预览中点击图片不打开灯箱
test("[TC-US10-12] 预览中点击图片不打开灯箱", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const id = await adminApi(page, baseURL!).create({ title: `[E2E-US10] 预览 ${Date.now().toString(36)}`, body: "![山](/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg)" });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  const image = page.getByTestId("md-preview").locator("figure[data-article-image] img");
  await image.click();
  await page.waitForTimeout(500);
  await expect(lightbox(page)).toHaveCount(0);
});

// [TC-US10-08][SC-LIGHTBOX-07] 灯箱内实况照片悬停播放
test("[TC-US10-08] 灯箱内实况照片播放", async ({ page }) => {
  await openHello(page);
  await content(page).getByRole("button", { name: "查看大图：实况" }).click();
  await expect(counter(page)).toHaveText("11 / 12");
  const card = lightbox(page).locator("[data-carousel-card='10']");
  await expect(card.locator("[data-live-badge]")).toBeVisible({ timeout: 15_000 });
  // 不用 hover()：WebKit 下等待 3D 卡片"稳定"较久，返回时只播一次的视频可能已播完；直接把指针移到卡片中心
  const box = (await card.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => card.locator("video").evaluate((v: HTMLVideoElement) => !v.paused && v.muted), { intervals: [100] }).toBe(true);
});

// [TC-US10-09][SC-LIGHTBOX-08] 焦点只在灯箱内循环；减弱动效下切换无位移过渡
test("[TC-US10-09] 焦点循环与减弱动效", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHello(page);
  await content(page).getByRole("button", { name: "查看大图：山" }).click();
  await expect(counter(page)).toHaveText("1 / 12"); // 灯箱动态加载，出现后再按键
  await page.keyboard.press("ArrowRight");
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true);
  }
  const card = lightbox(page).locator("[data-carousel-card='2']");
  const before = await card.evaluate((el) => el.style.transform);
  await page.keyboard.press("ArrowRight");
  expect(await card.evaluate((el) => el.style.transform)).not.toBe(before);
});

// [TC-US10-10][SC-LIGHTBOX-09] 图片加载失败与重试
test("[TC-US10-10] 灯箱中图片加载失败", async ({ page }) => {
  await openHello(page);
  await content(page).getByRole("button", { name: "查看大图：山" }).click();
  await expect(counter(page)).toHaveText("1 / 12");
  for (let i = 0; i < 11; i++) await page.keyboard.press("ArrowRight");
  await expect(counter(page)).toHaveText("12 / 12");
  await expect(lightbox(page).getByRole("alert")).toContainText("图片加载失败");
  const retried = page.waitForRequest(/zzzzzzzzzz_800x600_808080\.jpg\?retry=1/);
  await lightbox(page).getByRole("button", { name: "重试" }).click();
  await retried;
  await page.keyboard.press("ArrowLeft");
  await expect(counter(page)).toHaveText("11 / 12");
});
