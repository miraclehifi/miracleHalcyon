import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// [TC-US08-01][SC-PUBLISH-01][SC-PUBLISH-09] 草稿点"发布"：先保存未保存的修改再发布 → 徽标"已发布"、提示"已发布，几分钟后读者可见"；
// 读者端 GET /api/posts/:slug 返回 200，内容与发布时一致
test("[TC-US08-01] 发布草稿后读者可按 slug 读取", async ({ page, baseURL }, testInfo) => {
  const run = `${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const slug = `hello-astro-${run}`;
  await login(page);
  const id = await adminApi(page, baseURL!).create({ title: `Hello Astro ${run}`, slug, body: "# Hi\n正文 V1" });
  expect((await page.request.get(`/api/posts/${slug}`)).status()).toBe(404);

  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  await page.getByRole("textbox", { name: "正文" }).press("ControlOrMeta+End"); // 光标移到正文末尾
  await page.getByRole("textbox", { name: "正文" }).pressSequentially(" 末尾");
  await page.getByRole("button", { name: "发布", exact: true }).click(); // 自动保存的 2 秒防抖未到

  await expect(page.getByRole("status").filter({ hasText: "已发布，几分钟后读者可见" })).toBeVisible();
  const banner = page.getByRole("banner");
  await expect(banner.getByText("已发布", { exact: true })).toBeVisible();
  await expect(banner.getByRole("button", { name: "发布更新" })).toBeVisible();

  const response = await page.request.get(`/api/posts/${slug}`);
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ title: `Hello Astro ${run}`, body: "# Hi\n正文 V1 末尾" });
});
