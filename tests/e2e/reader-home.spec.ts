import { expect, test } from "@playwright/test";

// 首页自我介绍（reader-home.md，US-02）。配置：src/config/site.ts 占位内容（_fixtures.md"站点配置夹具"）

// [TC-US02-01][SC-HOME-01] 首页内容来自配置且不列文章；首页不显示 `> cd ..`（TC-US01-06 补跑）
test("[TC-US02-01] 首页自我介绍", async ({ page }) => {
  await page.goto("/");
  const avatar = page.getByRole("img", { name: "Halcyon 的头像" });
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute("width", "96");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("你好，我是 Halcyon");
  await expect(page.locator("main p[data-bio]")).toHaveCount(3);
  await expect(page.locator('main a[href^="/posts/"]')).toHaveCount(0);
  await expect(page.locator("article")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "> cd .." })).toHaveCount(0);
  await expect(page.getByRole("banner").locator("[aria-current]")).toHaveCount(0);
});

// [TC-US02-02][SC-HOME-02] 社交链接新标签页、邮箱 mailto；摄影站为空时不显示（TC-US02-03 端到端部分）
test("[TC-US02-02] 社交链接与邮箱", async ({ page }) => {
  await page.goto("/");
  const main = page.locator("main");
  const github = main.getByRole("link", { name: "GitHub" });
  await expect(github).toHaveAttribute("href", "https://github.com/example");
  await expect(github).toHaveAttribute("target", "_blank");
  await expect(github).toHaveAttribute("rel", "noopener noreferrer");
  const email = main.getByRole("link", { name: "me@example.com" });
  await expect(email).toHaveAttribute("href", "mailto:me@example.com");
  expect(await email.getAttribute("target")).toBeNull();
  await expect(main.getByRole("link", { name: "摄影" })).toHaveCount(0);
  expect(await page.locator('a[href=""], a:not([href])').count()).toBe(0);
});
