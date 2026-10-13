import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";

// [TC-US07-15][SC-POSTLIST-04] 状态筛选：结果与数量正确，同步到 URL ?status=，刷新保持，切换后回到第 1 页
// 本地 D1 被并行用例共享：只断言本次前缀的文章与"每行状态一致""数量与接口一致"这类不变量
const total = async (page: Page, status: string) =>
  ((await (await page.request.get(`/api/admin/posts?status=${status}`)).json()) as { total: number }).total;

const radio = (page: Page, label: string) => page.getByRole("radio", { name: new RegExp(`^${label}`) });

test("[TC-US07-15] 草稿 / 已发布 / 全部筛选，数量与 URL 同步", async ({ page, baseURL }, testInfo) => {
  const prefix = `F${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const api = adminApi(page, baseURL!);
  await login(page);
  for (const name of ["D1", "D2"]) await api.create({ title: `${prefix} ${name}` });
  for (const name of ["P1", "P2", "P3"]) {
    const slug = `${prefix}-${name}`.toLowerCase();
    await api.publish(await api.create({ title: `${prefix} ${name}`, slug, body: name }));
  }
  const mine = page.getByRole("listitem").filter({ hasText: prefix });

  await page.goto("/admin?page=2");
  await radio(page, "草稿").click();
  await expect(page).toHaveURL(/\/admin\?status=draft$/); // 切换后回到第 1 页
  await expect(mine).toHaveCount(2);
  await expect(page.getByRole("listitem").filter({ hasText: "已发布" })).toHaveCount(0);
  await expect(radio(page, "草稿")).toContainText(String(await total(page, "draft")));
  await expect(radio(page, "已发布")).toContainText(String(await total(page, "published")));

  await page.reload();
  await expect(radio(page, "草稿")).toHaveAttribute("aria-checked", "true");
  await expect(mine).toHaveCount(2);

  await radio(page, "已发布").click();
  await expect(page).toHaveURL(/\/admin\?status=published$/);
  await expect(mine).toHaveCount(3);
  await expect(page.getByRole("listitem").filter({ hasText: /草稿/ })).toHaveCount(0);

  await radio(page, "全部").click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(mine).toHaveCount(5);
});
