import { expect, test, type Page } from "@playwright/test";
import { waitForHydration } from "./support/hydration";

// 文章卡片细节（reader-post-list.md"文章卡片"，US-04）。数据：reader-fixture
const card = (page: Page, title: string) => page.getByRole("list", { name: "文章" }).getByRole("article").filter({ has: page.getByRole("heading", { name: title }) });
// Tailwind 4 的 translate-* 写在 CSS translate 属性上（不是 transform）
const topShift = (page: Page, title: string) => card(page, title).locator('[data-layer="top"]').evaluate((el) => getComputedStyle(el).translate);
// 等水合与列表入场动画（pop，约 620ms + 逐行 50ms）结束后再量尺寸
async function settled(page: Page) {
  await waitForHydration(page);
  await page.waitForTimeout(1500);
}

// [TC-US04-03][TC-US04-04][SC-BROWSE-03] 无摘要文章取正文纯文本，最多 3 行
test("[TC-US04-04] 正文摘要最多 3 行且不露出原文", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/posts");
  const excerpt = card(page, "Prev Post").locator("[data-excerpt]");
  await expect(excerpt).toContainText("标题 粗体文字");
  expect(await excerpt.textContent()).not.toMatch(/[#*!]|\]\(/);
  const { h, lh } = await excerpt.evaluate((el) => ({ h: el.clientHeight, lh: parseFloat(getComputedStyle(el).lineHeight) }));
  expect(h).toBeLessThanOrEqual(lh * 3 + 1);
});

// [TC-US04-05][SC-BROWSE-04] 封面与无封面布局
test("[TC-US04-05] 封面显示与无封面布局", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/posts");
  await settled(page);
  const cover = card(page, "Hello Halcyon").locator("img");
  await expect(cover).toHaveCSS("object-fit", "cover");
  const box = (await cover.boundingBox())!;
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([128, 128]);
  await expect(card(page, "Prev Post").locator("img")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const phone = (await cover.boundingBox())!;
  expect([Math.round(phone.width), Math.round(phone.height)]).toEqual([72, 72]);
});

// [TC-US04-09][SC-BROWSE-09] 悬停错位；减弱动效与触屏不移动
test("[TC-US04-09] 悬停错位效果", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/posts");
  await settled(page);
  await card(page, "Hello Halcyon").hover();
  await expect.poll(() => topShift(page, "Hello Halcyon")).toBe("-4px -4px");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(0, 0);
  await card(page, "Latest Post").hover();
  await page.waitForTimeout(400);
  expect(["none", "0px"]).toContain(await topShift(page, "Latest Post"));
});

test("[TC-US04-09] 触屏点按不错位", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/posts");
  await settled(page);
  // 触屏没有悬停：即使列表因兼容事件选中了该行，(hover: hover) 之外也不错位
  await card(page, "Hello Halcyon").locator("time").dispatchEvent("mouseover");
  await page.waitForTimeout(400);
  expect(["none", "0px"]).toContain(await topShift(page, "Hello Halcyon"));
  await context.close();
});
