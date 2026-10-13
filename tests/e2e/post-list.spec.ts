import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";

// [TC-US07-01][SC-POSTLIST-01][SC-POSTLIST-03] 登录后 /admin 列出全部文章（含草稿）按更新时间倒序；"新建文章"进入 /admin/posts/new
// 本地 D1 被并行用例共享：标题带本次运行的唯一前缀，只断言这几篇的相对顺序
test("[TC-US07-01] 列表按更新时间倒序显示草稿与已发布文章；新建文章进入写文章页", async ({ page, baseURL }, testInfo) => {
  const prefix = `L${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const api = adminApi(page, baseURL!);
  await login(page);

  const c = await api.create({ title: `${prefix} 已发布 C`, slug: `${prefix}-c`.toLowerCase(), body: "C1" });
  await api.publish(c);
  await api.save(c, { title: `${prefix} 已发布 C`, slug: `${prefix}-c`.toLowerCase(), body: "C2" }); // 有未发布修改
  const b = await api.create({ title: `${prefix} 已发布 B`, slug: `${prefix}-b`.toLowerCase(), body: "B1" });
  await api.publish(b);
  await api.create({ title: `${prefix} 草稿 A` });

  await page.goto("/admin");
  const rows = page.getByRole("listitem").filter({ hasText: prefix });
  await expect(rows).toHaveCount(3);
  const texts = await rows.allTextContents();
  expect(texts.map((text) => text.replace(/更新于.*$/, ""))).toEqual([
    `${prefix} 草稿 A草稿`,
    `${prefix} 已发布 B已发布`,
    `${prefix} 已发布 C已发布 · 有未发布修改`,
  ]);
  await expect(rows.first().getByRole("link")).toHaveAttribute("href", /^\/admin\/posts\/\d+$/);
  await expect(page.getByText(/^共 \d+ 篇$/)).toBeVisible();

  await page.getByRole("button", { name: "新建文章" }).click();
  await expect(page).toHaveURL(/\/admin\/posts\/new$/);
});
