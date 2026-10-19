import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// [TC-US02-08][SC-CLEANUP-11] 实况视频已被清理（R2 中没有 .live.mp4）的图片重新加上 #live：悬停尝试播放失败后隐藏 LIVE，只显示静态图。
// 用 e2e:seed 的普通图片夹具（本来就没有视频）模拟"视频已清理"；读者页与预览共用 ArticleImage（一致性由 reader-images.spec 覆盖）
const PLAIN = "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg";

test("[TC-US02-08] 视频不存在的图片带 #live：悬停后隐藏 LIVE、无视频、静态图正常、无未捕获错误", async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const id = await adminApi(page, baseURL!).create({ title: `[E2E-F006] 视频已清理 ${Date.now().toString(36)}`, body: `![已清理](${PLAIN}#live)` });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  const figure = page.getByTestId("md-preview").locator("figure[data-article-image][data-live]");
  await expect(figure.locator("[data-live-badge]")).toBeVisible({ timeout: 15_000 });

  await figure.hover();
  await expect(figure.locator("[data-live-badge]")).toHaveCount(0);
  await expect(figure.locator("video")).toHaveCount(0);
  await expect(figure.getByRole("img", { name: "已清理" })).toBeVisible();
  expect(errors).toEqual([]);
});
