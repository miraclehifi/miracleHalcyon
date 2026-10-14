import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";

// [TC-US08-05][TC-US08-17][SC-PUBLISH-04][SC-PUBLISH-08] 已发布文章修改并自动保存后徽标"已发布 · 有未发布修改"、"发布更新"可用；
// 点击后读者读到新内容，徽标回到"已发布"，按钮置灰（aria-disabled，提示"没有未发布的修改"）
test("[TC-US08-05] 发布更新后读者看到新内容、按钮置灰", async ({ page, baseURL }, testInfo) => {
  const run = `${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const slug = `v-post-${run}`;
  await login(page);
  const api = adminApi(page, baseURL!);
  const id = await api.create({ title: `V ${run}`, slug, body: "V1" });
  await api.publish(id);

  await page.goto(`/admin/posts/${id}`);
  await page.waitForSelector("astro-island:not([ssr])");
  const banner = page.getByRole("banner");
  const update = banner.getByRole("button", { name: "发布更新" });
  await expect(update).toHaveAttribute("aria-disabled", "true"); // 已发布且无修改

  await page.getByRole("textbox", { name: "正文" }).fill("V2");
  await expect(banner.getByText("已发布 · 有未发布修改", { exact: true })).toBeVisible({ timeout: 5000 }); // 自动保存完成
  await expect(update).not.toHaveAttribute("aria-disabled");

  await update.click();
  await expect(page.getByRole("status").filter({ hasText: "已发布更新" })).toBeVisible();
  await expect(banner.getByText("已发布", { exact: true })).toBeVisible();
  await expect(update).toHaveAttribute("aria-disabled", "true");
  await expect(update).toHaveAccessibleDescription("没有未发布的修改");
  expect(((await (await page.request.get(`/api/posts/${slug}`)).json()) as { body: string }).body).toBe("V2");
});
