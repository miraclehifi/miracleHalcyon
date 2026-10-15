import { expect, test, type Page } from "@playwright/test";
import { waitForHydration } from "./support/hydration";

// 文章详情页正文图片（reader-post-detail.md"图片与灯箱"，US-10）。数据：reader-fixture 的 hello（12 张图片）
const content = (page: Page) => page.locator("#article-content");
const mounted = (page: Page) => content(page).locator("figure[data-article-image]:has([data-status])");

async function openHello(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/posts/hello");
  await waitForHydration(page);
}

// [TC-US10-01][SC-LIGHTBOX-01] 图注、宽图、网格 3 列、手风琴默认展开中间、实况悬停播放、预留宽高比
test("[TC-US10-01] 读者页图片展示与预览一致", async ({ page }) => {
  await openHello(page);
  const first = mounted(page).first();
  await expect(first.locator("figcaption")).toHaveText("图注一");
  await expect(first.locator("[data-status]")).toHaveCSS("--rf-aspect", "1600 / 900");

  const wide = content(page).locator("figure[data-article-image][data-wide]");
  const proseWidth = await content(page).evaluate((el) => el.clientWidth);
  expect((await wide.boundingBox())!.width).toBeGreaterThan(proseWidth);

  const grid = content(page).locator('figure[data-image-gallery="grid"]');
  await expect(grid.locator("[data-gallery-item]")).toHaveCount(3);
  const columns = await grid.locator(":scope > div > .grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(3);

  const accordion = content(page).locator('figure[data-image-gallery="accordion"]');
  await expect(accordion.locator("[role=listitem]")).toHaveCount(5);

  const live = content(page).locator("figure[data-article-image][data-live]");
  await live.scrollIntoViewIfNeeded();
  await expect(live.locator("[data-live-badge]")).toBeVisible({ timeout: 15_000 });
  await live.hover();
  await expect.poll(() => live.locator("video").evaluate((v: HTMLVideoElement) => !v.paused && v.muted), { intervals: [100] }).toBe(true);
});

// [TC-US10-02][SC-LIGHTBOX-01] 加载与水合过程中累计布局偏移 < 0.1（手机宽度）
test("[TC-US10-02] 图片加载不引起布局偏移", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    (window as unknown as { __cls: number }).__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
        if (!entry.hadRecentInput) (window as unknown as { __cls: number }).__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/posts/hello");
  await waitForHydration(page);
  await page.waitForTimeout(1500);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThan(0.1);
});

// [TC-US10-12][SC-LIGHTBOX-02] 无图文章不加载图片岛（不含 React 运行时由 check-reader-build-output 检查）
test("[TC-US10-12] 无图文章不渲染图片岛", async ({ page }) => {
  await page.goto("/posts/latest-post");
  await expect(page.locator("astro-island")).toHaveCount(0);
});
