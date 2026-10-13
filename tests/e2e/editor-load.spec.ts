import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";

// [TC-US03-19][SC-POSTINFO-03] 打开已有文章显示最新保存的内容；[TC-US03-26][SC-POSTINFO-11] 不存在的文章显示 404
test("[TC-US03-19] /admin/posts/:id 显示最新保存的标题与正文", async ({ page, baseURL }, testInfo) => {
  const title = `E${Date.now().toString(36)}${testInfo.project.name[0]} 旧标题`;
  const api = adminApi(page, baseURL!);
  await login(page);
  const id = await api.create({ title, body: "旧正文" });
  await api.save(id, { title, body: "旧正文-v2" });

  await page.goto(`/admin/posts/${id}`);
  await expect(page.getByRole("textbox", { name: "标题" })).toHaveValue(title);
  await expect(page.getByRole("textbox", { name: "正文" })).toHaveValue("旧正文-v2");
  await expect(page.getByRole("banner").getByText("草稿", { exact: true })).toBeVisible();
});

test("[TC-US03-26] 不存在的文章返回 404 并提供返回文章列表", async ({ page }) => {
  await login(page);
  for (const id of ["999999999", "nope"]) {
    const response = await page.goto(`/admin/posts/${id}`);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("文章不存在或已被删除")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "正文" })).toHaveCount(0);
  }
  await page.getByRole("link", { name: "返回文章列表" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});
