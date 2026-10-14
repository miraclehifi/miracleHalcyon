import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// [TC-US08-06][SC-PUBLISH-05] 设置抽屉"撤回为草稿"→ 确认框 → 确认后徽标"草稿"、提示"已撤回为草稿"；
// 读者端 GET /api/posts/:slug 返回 404，编辑内容保留
test("[TC-US08-06] 撤回为草稿后读者不可见、内容保留", async ({ page, baseURL }, testInfo) => {
  const run = `${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const slug = `to-draft-${run}`;
  const title = `撤回 ${run}`;
  await login(page);
  const api = adminApi(page, baseURL!);
  const id = await api.create({ title, slug, body: "B1" });
  await api.publish(id);
  await api.save(id, { title, slug, body: "B2" }); // 有未发布修改

  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  await page.getByRole("button", { name: "设置" }).click();
  await page.getByRole("complementary", { name: "文章设置" }).getByRole("button", { name: "撤回为草稿" }).click();

  const dialog = page.getByRole("dialog", { name: "撤回为草稿？" });
  await expect(dialog).toContainText("文章将对读者不可见，内容会保留，之后可以重新发布。");
  await dialog.getByRole("button", { name: "撤回为草稿" }).click();

  await expect(page.getByRole("status").filter({ hasText: "已撤回为草稿" })).toBeVisible();
  await expect(page.getByRole("banner").getByText("草稿", { exact: true })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("button", { name: "发布", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "撤回为草稿" })).toHaveCount(0); // 草稿不显示撤回
  expect((await page.request.get(`/api/posts/${slug}`)).status()).toBe(404);

  await page.reload();
  await expect(page.getByRole("textbox", { name: "正文" })).toHaveValue("B2");
  await expect(page.getByRole("textbox", { name: "标题" })).toHaveValue(title);
});
