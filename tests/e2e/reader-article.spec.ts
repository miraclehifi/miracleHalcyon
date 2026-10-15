import { expect, test } from "@playwright/test";

// 文章详情（reader-post-detail.md，US-07）。数据：reader-fixture（_fixtures.md）

// [TC-US07-02][SC-ARTICLE-01] 正文结构：单一 h1、标题 id、代码高亮；顶栏"文章"高亮，`> cd ..` 回 /posts（TC-US01-01 / 06 补跑）
test("[TC-US07-02] 详情页正文结构", async ({ page }) => {
  await page.goto("/posts/hello");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hello Halcyon");
  const content = page.locator(".article-content");
  await expect(content.locator("h2[id]")).toHaveCount(3);
  await expect(content.locator("h3[id]")).toHaveCount(2);
  await expect(content.locator("h2#安装")).toHaveText("安装");
  await expect(content.locator(".expressive-code pre span[style]").first()).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "文章" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "> cd .." })).toHaveAttribute("href", "/posts");
});

// [TC-US07-04][SC-ARTICLE-03] 标题区：长日期、字数与阅读时长、更新于、标签链接
test("[TC-US07-04] 标题区", async ({ page }) => {
  await page.goto("/posts/hello");
  const header = page.locator("article > header");
  await expect(header.locator('time[datetime="2026-10-10"]')).toHaveText("2026年10月10日 星期六");
  await expect(header).toContainText(/约 \d[\d,]* 字 · 阅读 \d+ 分钟/);
  await expect(header).toContainText("更新于 2026年10月12日");
  await expect(header.getByRole("link", { name: "Astro" })).toHaveAttribute("href", "/tags/astro");
  await expect(header.getByRole("link", { name: "Cloudflare" })).toHaveAttribute("href", "/tags/cloudflare");

  await page.goto("/posts/prev-post");
  await expect(page.locator("article > header")).not.toContainText("更新于");
});

// [TC-US07-11][SC-ARTICLE-08] 草稿、已撤回、不存在、大小写不符的 slug 为 404
test("[TC-US07-11] 不存在的文章地址返回 404", async ({ page }) => {
  for (const path of ["/posts/draft-post", "/posts/withdrawn-post", "/posts/nope", "/posts/Hello"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "页面不存在" })).toBeVisible();
  }
});
