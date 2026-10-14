import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// [TC-US07-19][SC-POSTLIST-08] 分页：每页 20 篇，范围文案，?page= 同步，当前页 aria-current，首末页禁用上 / 下一页；只有 1 页时隐藏
// 本地 D1 被并行用例共享：用唯一关键字搜索出本次创建的文章
test("[TC-US07-19] 23 篇分两页，第 2 页 3 篇；只有 1 页时不显示分页", async ({ page, baseURL }, testInfo) => {
  const token = `p${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const api = adminApi(page, baseURL!);
  await login(page);
  for (let i = 1; i <= 23; i++) await api.create({ title: `${token}-a 第 ${i} 篇` });
  await api.create({ title: `${token}-solo` });

  await page.goto(`/admin?q=${token}-a`);
  await waitForHydration(page);
  const pager = page.getByRole("navigation", { name: "分页" });
  await expect(page.getByRole("listitem")).toHaveCount(20);
  await expect(page.getByText("第 1–20 篇，共 23 篇")).toBeVisible();
  await expect(pager.getByRole("link", { name: "1", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(pager.getByText("上一页")).toHaveAttribute("aria-disabled", "true");

  await pager.getByRole("link", { name: "2", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`[?&]page=2$`));
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await expect(page.getByText("第 21–23 篇，共 23 篇")).toBeVisible();
  await expect(pager.getByRole("link", { name: "2", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(pager.getByText("下一页")).toHaveAttribute("aria-disabled", "true");

  await pager.getByRole("link", { name: "上一页" }).click();
  await expect(page.getByRole("listitem")).toHaveCount(20);

  await page.goto(`/admin?q=${token}-solo`);
  await waitForHydration(page);
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(pager).toHaveCount(0);
});
