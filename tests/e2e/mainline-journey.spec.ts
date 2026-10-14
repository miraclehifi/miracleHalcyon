import { expect, test } from "@playwright/test";
import { PASSWORD, USERNAME } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// Sprint 1 主干旅程（DoD）：全程界面操作，不经接口造数据
// 登录 → 新建 → 自动保存 → 列表可见 → 发布 → 读者端 200 → 撤回 → 404
test("[Sprint 1 主干] 登录后写一篇文章，发布后读者可见，撤回后不可见", async ({ page }, testInfo) => {
  const run = `${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const title = `Journey ${run}`;
  const slug = `journey-${run}`;
  const body = "# 主干旅程\n第一段正文";

  // US-01 登录
  await page.goto("/admin/login");
  await waitForHydration(page);
  await page.getByLabel("账号").fill(USERNAME);
  await page.getByLabel("密码").fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/admin$/);

  // US-03 / US-06 新建并自动保存
  await waitForHydration(page);
  await page.getByRole("button", { name: "新建文章" }).click();
  await expect(page).toHaveURL(/\/admin\/posts\/new$/);
  await waitForHydration(page);
  await page.getByRole("textbox", { name: "标题" }).fill(title);
  await page.getByRole("textbox", { name: "正文" }).fill(body);
  await expect(page.getByRole("banner").getByRole("status")).toHaveText(/^已保存 · \d{2}:\d{2}$/, { timeout: 5000 });
  await expect(page).toHaveURL(/\/admin\/posts\/\d+$/);
  const editUrl = new URL(page.url()).pathname;

  // US-07 列表可见（草稿），从列表回到写文章页
  await page.getByRole("button", { name: "文章", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await waitForHydration(page);
  // 按标题搜索：并行用例（如分页）会造一批文章，把这篇挤出第 1 页
  await page.getByRole("searchbox", { name: "搜索标题" }).fill(run);
  await expect(page).toHaveURL(new RegExp(`[?&]q=${run}`));
  const row = page.getByRole("listitem").filter({ hasText: title });
  await expect(row).toContainText("草稿");
  await row.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`${editUrl}$`));
  await waitForHydration(page);

  // US-08 发布 → 读者端可读
  await page.getByRole("button", { name: "发布", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "已发布，几分钟后读者可见" })).toBeVisible();
  const published = await page.request.get(`/api/posts/${slug}`);
  expect(published.status()).toBe(200);
  expect(await published.json()).toMatchObject({ title, body });

  // US-08 撤回 → 读者端不可见
  await page.getByRole("button", { name: "设置" }).click();
  await page.getByRole("complementary", { name: "文章设置" }).getByRole("button", { name: "撤回为草稿" }).click();
  await page.getByRole("alertdialog", { name: "撤回为草稿？" }).getByRole("button", { name: "撤回为草稿" }).click();
  await expect(page.getByRole("status").filter({ hasText: "已撤回为草稿" })).toBeVisible();
  expect((await page.request.get(`/api/posts/${slug}`)).status()).toBe(404);
});
