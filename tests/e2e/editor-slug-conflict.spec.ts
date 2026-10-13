import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";

// [TC-US03-23][SC-POSTINFO-08] 保存时 slug 与其他文章重复：设置抽屉自动打开，slug 输入框标红并提示"slug 已存在，请换一个"，服务端 slug 不变
test("[TC-US03-23] 重复 slug 提示已存在并保持原值", async ({ page, baseURL }, testInfo) => {
  const run = `${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const api = adminApi(page, baseURL!);
  await login(page);
  await api.create({ title: `B ${run}`, slug: `hello-astro-${run}` });
  const a = await api.create({ title: `A ${run}`, slug: `orig-${run}` });

  await page.goto(`/admin/posts/${a}`);
  await page.waitForSelector("astro-island:not([ssr])");
  await page.getByRole("button", { name: "设置" }).click();
  await page.getByLabel(/^Slug/).fill(`hello-astro-${run}`);
  await page.getByRole("button", { name: "关闭设置" }).click();
  await page.keyboard.press("ControlOrMeta+s");

  const slug = page.getByLabel(/^Slug/);
  await expect(slug).toBeVisible(); // 抽屉自动打开
  await expect(slug).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("slug 已存在，请换一个")).toBeVisible();
  const saved = (await (await page.request.get(`/api/admin/posts/${a}`)).json()) as { slug: string };
  expect(saved.slug).toBe(`orig-${run}`);

  await slug.fill(`fresh-${run}`); // 改掉后错误消失
  await expect(page.getByText("slug 已存在，请换一个")).toHaveCount(0);
});
