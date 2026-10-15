import { expect, test, type Page } from "@playwright/test";

// 同标签文章与上一篇 / 下一篇（reader-post-detail.md，US-08、US-09）。数据：reader-fixture
const related = (page: Page) => page.getByRole("navigation", { name: "同标签文章" });
const pager = (page: Page) => page.getByRole("navigation", { name: "上一篇 / 下一篇" });

// [TC-US08-01][SC-SIDEBAR-01][SC-SIDEBAR-02] 宽屏左栏同标签文章；窄屏移到文末
test("[TC-US08-01] 同标签文章：宽屏左栏、窄屏文末", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/posts/hello");
  const nav = related(page).filter({ visible: true });
  await expect(nav.getByRole("link")).toHaveCount(8);
  await expect(nav.getByRole("link").first()).toContainText("Filler 01");
  const navBox = (await nav.boundingBox())!;
  const paperBox = (await page.locator("article").first().boundingBox())!;
  expect(navBox.x + navBox.width).toBeLessThan(paperBox.x);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = related(page).filter({ visible: true });
  await expect(mobile).toHaveCount(1);
  const mobileBox = (await mobile.boundingBox())!;
  const pagerBox = (await pager(page).boundingBox())!;
  expect(mobileBox.y).toBeLessThan(pagerBox.y);
});

// [TC-US08-03][SC-SIDEBAR-03] 无同标签文章时不显示
test("[TC-US08-03] 无同标签文章时不显示", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const slug of ["first-post", "latest-post"]) {
      await page.goto(`/posts/${slug}`);
      await expect(related(page)).toHaveCount(0);
    }
  }
});

// [TC-US09-01][SC-PREVNEXT-01][SC-PREVNEXT-05] 文末相邻文章，跳过草稿与已撤回
test("[TC-US09-01] 文末上一篇 / 下一篇", async ({ page }) => {
  await page.goto("/posts/hello");
  await expect(pager(page).getByRole("link", { name: /上一篇.*Prev Post/ })).toHaveAttribute("href", "/posts/prev-post");
  await expect(pager(page).getByRole("link", { name: /下一篇.*Latest Post/ })).toHaveAttribute("href", "/posts/latest-post");
  await expect(pager(page)).not.toContainText("Withdrawn");
  await expect(pager(page)).not.toContainText("Draft");
});

// [TC-US09-02][SC-PREVNEXT-02][SC-PREVNEXT-03] 首尾只显示一侧
test("[TC-US09-02] 首尾只显示一侧", async ({ page }) => {
  await page.goto("/posts/first-post");
  await expect(pager(page).getByRole("link")).toHaveCount(1);
  await expect(pager(page).getByRole("link")).toContainText("Filler 36");
  await page.goto("/posts/latest-post");
  await expect(pager(page).getByRole("link")).toHaveCount(1);
  await expect(pager(page).getByRole("link")).toContainText("Hello Halcyon");
});
