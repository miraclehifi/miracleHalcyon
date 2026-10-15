import { expect, test, type Page } from "@playwright/test";

// 标签页与标签索引（reader-post-list.md，US-05、US-04 AC8）。数据：reader-fixture
const cards = (page: Page) => page.getByRole("list", { name: "文章" }).getByRole("article");
const titles = (page: Page) => cards(page).getByRole("heading").allTextContents();

// [TC-US05-01][SC-TAG-01] 标签页内容与页头
test("[TC-US05-01] 标签页内容与页头", async ({ page }) => {
  await page.goto("/tags/cloudflare");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("#Cloudflare");
  await expect(page.getByText("2 篇文章")).toBeVisible();
  expect(await titles(page)).toEqual(["Hello Halcyon", "Filler 01"]);
  await expect(page.getByRole("link", { name: "全部文章" })).toHaveAttribute("href", "/posts");
  await expect(page.getByRole("link", { name: "> cd .." })).toHaveAttribute("href", "/");
  await expect(page.getByRole("banner").getByRole("link", { name: "文章" })).toHaveAttribute("aria-current", "page");
});

// [TC-US05-02][SC-TAG-02] 大小写合并与规范地址
test("[TC-US05-02] 大小写合并", async ({ page }) => {
  await page.goto("/tags/astro");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("#Astro");
  await expect(page.getByText("25 篇文章")).toBeVisible();
  await page.goto("/tags/astro/page/2");
  expect(await titles(page)).toContain("Filler 18");
  await page.goto("/posts");
  await expect(cards(page).filter({ hasText: "Case Lower" }).getByRole("link", { name: "#astro" })).toHaveAttribute("href", "/tags/astro");
  expect((await page.goto("/tags/Astro"))?.status()).toBe(404);
});

// [TC-US05-03][SC-TAG-03] 特殊字符标签
test("[TC-US05-03] 特殊字符标签", async ({ page }) => {
  await page.goto("/posts");
  await cards(page).filter({ hasText: "Latest Post" }).getByRole("link", { name: "#C# 与 .NET/Core" }).click();
  await expect(page).toHaveURL(/\/tags\/c-%E4%B8%8E-net-core$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("#C# 与 .NET/Core");
  expect(await titles(page)).toEqual(["Latest Post"]);
});

// [TC-US05-04][TC-US05-05][SC-TAG-04][SC-TAG-05] 标签页分页；只在草稿中的标签 404
test("[TC-US05-04][TC-US05-05] 标签页分页与 404", async ({ page }) => {
  await page.goto("/tags/astro");
  await expect(cards(page)).toHaveCount(20);
  await page.getByRole("navigation", { name: "分页" }).getByRole("link", { name: "下一页" }).click();
  await expect(page).toHaveURL("/tags/astro/page/2");
  await expect(cards(page)).toHaveCount(5);
  for (const path of ["/tags/astro/page/3", "/tags/astro/page/1", "/tags/secret"]) {
    expect((await page.goto(path))?.status(), path).toBe(404);
  }
});

// [TC-US04-10][SC-BROWSE-10] /posts 第 1 页的标签索引
test("[TC-US04-10] 标签索引", async ({ page }) => {
  await page.goto("/posts");
  const index = page.getByRole("navigation", { name: "按标签浏览" });
  const chips = await index.getByRole("link").allTextContents();
  expect(chips.slice(0, 3).map((t) => t.replace(/\s+/g, " ").trim())).toEqual(["# Astro · 25", "# Cloudflare · 2", "# C# 与 .NET/Core · 1"]);
  expect(chips.join()).not.toContain("Secret");
  await index.getByRole("link", { name: /Cloudflare/ }).click();
  await expect(page).toHaveURL("/tags/cloudflare");
  await page.goto("/posts/page/2");
  await expect(page.getByRole("navigation", { name: "按标签浏览" })).toHaveCount(0);
});
