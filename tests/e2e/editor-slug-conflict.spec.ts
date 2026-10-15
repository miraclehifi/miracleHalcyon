import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// [TC-US03-23][SC-POSTINFO-08] 保存时 slug 与其他文章重复：设置抽屉自动打开，slug 输入框标红并提示"slug 已存在，请换一个"，服务端 slug 不变
test("[TC-US03-23] 重复 slug 提示已存在并保持原值", async ({ page, baseURL }, testInfo) => {
  const run = `${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const api = adminApi(page, baseURL!);
  await login(page);
  await api.create({ title: `B ${run}`, slug: `hello-astro-${run}` });
  const a = await api.create({ title: `A ${run}`, slug: `orig-${run}` });

  await page.goto(`/admin/posts/${a}`);
  await waitForHydration(page);
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

// [TC-US03-22][SC-POSTINFO-07] 非法 slug：输入框下行内提示格式要求；Ctrl/Cmd+S 并等过自动保存窗口后服务端 slug 不变；改回合法值后提示消失
test("[TC-US03-22] 非法 slug 行内提示且不被保存", async ({ page, baseURL }, testInfo) => {
  const run = `${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const api = adminApi(page, baseURL!);
  await login(page);
  const id = await api.create({ title: `P ${run}`, slug: `valid-${run}` });

  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  await page.getByRole("button", { name: "设置" }).click();
  const slug = page.getByLabel(/^Slug/);
  const hint = page.getByText("仅允许小写字母、数字和连字符");
  await slug.fill("Hello World!");
  await expect(hint).toBeVisible();
  await expect(slug).toHaveAttribute("aria-invalid", "true");

  await page.keyboard.press("ControlOrMeta+s");
  await page.waitForTimeout(3000); // 覆盖 2 秒自动保存窗口：验证的是"这段时间内没有保存"
  const saved = (await (await page.request.get(`/api/admin/posts/${id}`)).json()) as { slug: string };
  expect(saved.slug).toBe(`valid-${run}`);

  await slug.fill(`valid2-${run}`);
  await expect(hint).toHaveCount(0);
});
