import { expect, test } from "@playwright/test";

// 读者端外壳（reader-shell.md，US-01）。首页 / 列表 / 详情页随各自任务补充当前项与 `> cd ..` 断言
const banner = (page: import("@playwright/test").Page) => page.getByRole("banner");

// [TC-US01-01][SC-SHELL-01] 桌面顶栏：导航项、外链属性；404 页不高亮任何项；摄影站为空时不显示
test("[TC-US01-01] 桌面顶栏导航项与外链属性", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/nope");
  const header = banner(page);
  await expect(header.getByRole("link", { name: "miracleHalcyon" })).toHaveAttribute("href", "/");
  await expect(header.getByRole("link", { name: "文章" })).toHaveAttribute("href", "/posts");
  await expect(header.getByRole("link", { name: "书影音" })).toHaveAttribute("href", "/media");
  await expect(header.getByRole("link", { name: "RSS" })).toHaveAttribute("href", "/rss.xml");
  const github = header.getByRole("link", { name: "GitHub（新标签页）" });
  await expect(github).toHaveAttribute("href", "https://github.com/example");
  await expect(github).toHaveAttribute("target", "_blank");
  await expect(github).toHaveAttribute("rel", /noopener/);
  await expect(github).toHaveAttribute("rel", /noreferrer/);
  await expect(header.getByRole("link", { name: /摄影/ })).toHaveCount(0);
  await expect(header.locator("[aria-current]")).toHaveCount(0);
  await expect(header.getByRole("button", { name: /^主题：/ })).toBeVisible();
});

// [TC-US01-05][SC-SHELL-05] 手机顶栏：文字项换成图标，GitHub / RSS 收起，可点区域 ≥ 44
test("[TC-US01-05] 手机顶栏图标化与触控尺寸", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nope");
  const header = banner(page);
  await expect(header.getByRole("link", { name: "文章" })).toBeVisible();
  await expect(header.getByRole("link", { name: "书影音" })).toBeVisible();
  await expect(header.getByRole("link", { name: "GitHub（新标签页）" })).toBeHidden();
  await expect(header.getByRole("link", { name: "RSS" })).toBeHidden();
  for (const el of await header.locator("nav a:visible, nav button:visible").all()) {
    const box = (await el.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

// [TC-US01-06][SC-SHELL-06] 404 页底部 `> cd ..` 回首页
test("[TC-US01-06] 404 页返回上一级", async ({ page }) => {
  await page.goto("/nope");
  await expect(page.getByRole("link", { name: "> cd .." })).toHaveAttribute("href", "/");
});

// [TC-US01-07][TC-US01-08][SC-SHELL-08][SC-SHELL-09] 未知路径 404 页；读者端无后台入口
test("[TC-US01-07][TC-US01-08] 未知路径返回 404 页且无后台入口", async ({ page }) => {
  for (const path of ["/media", "/rss.xml", "/nope", "/posts/nope/extra"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "页面不存在" })).toBeVisible();
    await expect(page.getByRole("link", { name: "回首页" })).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "看看全部文章" })).toHaveAttribute("href", "/posts");
    expect(await page.locator('a[href^="/admin"]').count()).toBe(0);
  }
  const admin = await page.request.get("/admin/posts/1", { maxRedirects: 0 });
  expect(admin.status()).toBe(302);
});
