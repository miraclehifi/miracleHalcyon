import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// [TC-US07-15][SC-POSTLIST-04] 状态筛选：结果与数量正确，同步到 URL ?status=，刷新保持，切换后回到第 1 页
// 本地 D1 被并行用例共享：带本次唯一关键字搜索，只看本次创建的 5 篇（分段数量也只按关键字统计）
const radio = (page: Page, label: string) => page.getByRole("radio", { name: new RegExp(`^${label}`) });

test("[TC-US07-15] 草稿 / 已发布 / 全部筛选，数量与 URL 同步", async ({ page, baseURL }, testInfo) => {
  const token = `f${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const api = adminApi(page, baseURL!);
  await login(page);
  for (const name of ["D1", "D2"]) await api.create({ title: `${token} ${name}` });
  for (const name of ["P1", "P2", "P3"]) {
    await api.publish(await api.create({ title: `${token} ${name}`, slug: `${token}-${name}`.toLowerCase(), body: name }));
  }
  const rows = page.getByRole("listitem");

  await page.goto(`/admin?q=${token}&page=2`);
  await waitForHydration(page);
  await expect(radio(page, "全部")).toContainText("5");
  await expect(radio(page, "草稿")).toContainText("2");
  await expect(radio(page, "已发布")).toContainText("3");

  await radio(page, "草稿").click();
  await expect(page).toHaveURL(new RegExp(`/admin[?]status=draft&q=${token}$`)); // 切换后回到第 1 页
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: "已发布" })).toHaveCount(0);

  await page.reload();
  await waitForHydration(page);
  await expect(radio(page, "草稿")).toHaveAttribute("aria-checked", "true");
  await expect(rows).toHaveCount(2);

  await radio(page, "已发布").click();
  await expect(page).toHaveURL(new RegExp(`/admin[?]status=published&q=${token}$`));
  await expect(rows).toHaveCount(3);
  await expect(rows.filter({ hasText: "草稿" })).toHaveCount(0);

  await radio(page, "全部").click();
  await expect(page).toHaveURL(new RegExp(`/admin[?]q=${token}$`));
  await expect(rows).toHaveCount(5);
});
