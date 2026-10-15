import { expect, test, type Page } from "@playwright/test";

// 文章列表 /posts（reader-post-list.md，US-04）。数据：reader-fixture（41 篇，_fixtures.md）
const cards = (page: Page) => page.getByRole("list", { name: "文章" }).getByRole("article");
const card = (page: Page, title: string) => cards(page).filter({ has: page.getByRole("heading", { name: title }) });

// [TC-US04-01][SC-BROWSE-01] 发布日期倒序、总数、不含草稿；顶栏"文章"高亮、cd .. 回首页（TC-US01-01 / 06 补跑）
test("[TC-US04-01] 列表按发布日期倒序", async ({ page }) => {
  await page.goto("/posts");
  await expect(page.getByRole("heading", { level: 1, name: "文章" })).toBeVisible();
  await expect(page.getByText("41 篇文章")).toBeVisible();
  await expect(cards(page)).toHaveCount(20);
  const titles = await cards(page).getByRole("heading").allTextContents();
  expect(titles.slice(0, 4)).toEqual(["Latest Post", "Hello Halcyon", "Prev Post", "Case Lower"]);
  expect(titles).not.toContain("Draft");
  expect(titles).not.toContain("Withdrawn");
  await expect(page.getByRole("banner").getByRole("link", { name: "文章" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "> cd .." })).toHaveAttribute("href", "/");
});

// [TC-US04-02][SC-BROWSE-02] 卡片内容与链接结构
test("[TC-US04-02] 卡片内容与链接", async ({ page }) => {
  await page.goto("/posts");
  const hello = card(page, "Hello Halcyon");
  await expect(hello).toContainText("手写摘要");
  await expect(hello.locator('time[datetime="2026-10-10"]')).toHaveText("2026-10-10");
  await expect(hello.getByRole("link", { name: "#Astro" })).toHaveAttribute("href", "/tags/astro");
  await expect(hello.getByRole("link", { name: "#Cloudflare" })).toHaveAttribute("href", "/tags/cloudflare");
  // 标签链接不嵌套在标题链接里
  await expect(hello.locator("a a")).toHaveCount(0);
  await hello.getByRole("link", { name: "Hello Halcyon" }).click();
  await expect(page).toHaveURL("/posts/hello");
  await page.goBack();
  await card(page, "Hello Halcyon").getByRole("link", { name: "#Astro" }).click();
  await expect(page).toHaveURL("/tags/astro");
});

// [TC-US04-06][SC-BROWSE-05] 分页导航
test("[TC-US04-06] 分页导航", async ({ page }) => {
  await page.goto("/posts");
  const nav = page.getByRole("navigation", { name: "分页" });
  await expect(nav.getByText("上一页")).toHaveAttribute("aria-disabled", "true");
  await expect(nav.getByRole("link", { name: "1" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "3" }).click();
  await expect(page).toHaveURL("/posts/page/3");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).getByRole("heading")).toHaveText("First Post");
  await expect(page.getByRole("navigation", { name: "分页" }).getByText("下一页")).toHaveAttribute("aria-disabled", "true");
  await page.getByRole("navigation", { name: "分页" }).getByRole("link", { name: "上一页" }).click();
  await expect(page).toHaveURL("/posts/page/2");
  await expect(page.getByRole("navigation", { name: "分页" }).getByRole("link", { name: "上一页" })).toHaveAttribute("href", "/posts");
});

// [TC-US04-07][SC-BROWSE-06][SC-BROWSE-07] 非法页码 404
test("[TC-US04-07] 非法页码返回 404", async ({ page }) => {
  for (const path of ["/posts/page/1", "/posts/page/4", "/posts/page/0", "/posts/page/abc"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});
