import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { PREFIX, shelfApi } from "./support/shelf";

// F-005 US-01 后台书影音条目列表（admin-media.md §一）。条目经接口创建、标题带唯一前缀，结束按前缀删除；
// 本地 D1 被并行用例共享且跨运行保留，断言只看本文件创建的行
test.afterAll(async ({ browser, baseURL }) => {
  const page = await browser.newPage();
  await login(page);
  await shelfApi(page.request, baseURL!).removeByPrefix();
  await page.close();
});

const row = (page: Page, title: string) => page.locator("li[data-entry-id]").filter({ hasText: title });

test("[TC-US01-01][SC-MANAGE-01][SC-MANAGE-02] 顶栏进入列表：分类、排序、隐藏标记；切到电影", async ({ page, baseURL }) => {
  await login(page);
  const api = shelfApi(page.request, baseURL!);
  const book = (title: string, status: "completed" | "in_progress", markedOn: string) => api.create({ title: `${PREFIX} ${title}`, status, markedOn, creator: "作者甲", rating: status === "completed" ? 4 : null });
  await book("A 读过", "completed", "2026-03-01");
  await book("B 在读", "in_progress", "2026-01-10");
  const hidden = await book("C 已隐藏", "completed", "2026-09-15");
  await page.request.post(`/api/admin/shelf/entries/${hidden.id}/hide`, { headers: { Origin: new URL(baseURL!).origin } });
  await api.create({ type: "movie", title: `${PREFIX} 电影 D`, status: "completed", markedOn: "2026-08-20" });

  await page.getByRole("link", { name: "书影音" }).first().click();
  await expect(page).toHaveURL(/\/admin\/media$/);
  await waitForHydration(page);
  await expect(page.getByRole("link", { name: "书影音" }).first()).toHaveAttribute("aria-current", "page");
  const tabs = page.getByRole("navigation", { name: "书影音分类" });
  await expect(tabs.getByRole("link", { name: "书", exact: true })).toHaveAttribute("aria-current", "page");

  const mine = page.locator("li[data-entry-id]").filter({ hasText: PREFIX });
  await expect(mine).toHaveCount(3);
  await expect(mine.first()).toContainText("B 在读");
  await expect(row(page, "B 在读")).toContainText("在读");
  await expect(row(page, "C 已隐藏")).toContainText("已隐藏");
  await expect(row(page, "A 读过").getByLabel("评分 4 / 5").first()).toBeVisible();

  await expect(tabs.getByRole("link")).toHaveText(["书", "漫画", "电影", "剧集", "游戏", "桌游"]);
  await tabs.getByRole("link", { name: "电影" }).click();
  await expect(page).toHaveURL(/\/admin\/media\?type=movie$/);
  await expect(page.locator("li[data-entry-id]").filter({ hasText: PREFIX })).toHaveCount(1);

  // 已去掉的分类按非法参数处理，回到"书"（drop-anime-type）
  await page.goto("/admin/media?type=anime");
  await expect(page.getByRole("navigation", { name: "书影音分类" }).getByRole("link", { name: "书", exact: true })).toHaveAttribute("aria-current", "page");
});

test("[TC-US01-14][SC-MANAGE-21] 未登录访问跳转登录", async ({ page }) => {
  await page.goto("/admin/media?type=movie");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fmedia%3Ftype%3Dmovie$/);
});

test("[TC-US01-17][SC-MANAGE-03] 空分类显示空状态与新增入口", async ({ page }) => {
  await login(page);
  await page.goto("/admin/media?type=boardgame");
  await waitForHydration(page);
  const others = await shelfApi(page.request, page.url()).list("boardgame");
  test.skip(others.length > 0, "本地库里已有桌游条目，空状态不可测");
  await expect(page.getByText("还没有桌游条目")).toBeVisible();
  await expect(page.getByRole("button", { name: "新增条目" })).toHaveCount(2);
});

test("[TC-US01-22][SC-MANAGE-14] 隐藏与取消隐藏：徽标、按钮文案、提示", async ({ page, baseURL }) => {
  await login(page);
  const entry = await shelfApi(page.request, baseURL!).create({ type: "comic", title: `${PREFIX} 隐藏用` });
  await page.goto("/admin/media?type=comic");
  await waitForHydration(page);
  const target = row(page, entry.title);
  await target.getByRole("button", { name: `隐藏《${entry.title}》` }).click();
  await expect(target).toContainText("已隐藏");
  await expect(page.getByText(`已隐藏《${entry.title}》，读者页将在重建后更新`)).toBeVisible();
  await target.getByRole("button", { name: `取消隐藏《${entry.title}》` }).click();
  await expect(target).not.toContainText("已隐藏");
  await expect(target.getByRole("button", { name: `隐藏《${entry.title}》` })).toBeVisible();
});

test("[TC-US01-23][SC-MANAGE-15][SC-MANAGE-16] 删除确认框：取消 / Esc 不删，确认后行消失", async ({ page, baseURL }) => {
  await login(page);
  const entry = await shelfApi(page.request, baseURL!).create({ type: "game", title: `${PREFIX} 删除用` });
  await page.goto("/admin/media?type=game");
  await waitForHydration(page);
  const target = row(page, entry.title);
  const deleteButton = target.getByRole("button", { name: `删除《${entry.title}》` });
  const dialog = page.getByRole("alertdialog");
  let deletes = 0;
  page.on("request", (r) => void (r.method() === "DELETE" && deletes++));

  await deleteButton.click();
  await expect(dialog).toContainText(`删除「${entry.title}」？`);
  await expect(dialog).toContainText("此操作不可撤销");
  await expect(dialog.getByRole("button", { name: "取消" })).toBeFocused();
  await dialog.getByRole("button", { name: "取消" }).click();
  await expect(dialog).toBeHidden();
  await expect(deleteButton).toBeFocused();

  await deleteButton.click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect(deletes).toBe(0);

  await deleteButton.click();
  await dialog.getByRole("button", { name: "删除" }).click();
  await expect(target).toHaveCount(0);
  await expect(page.getByText(`已删除《${entry.title}》`)).toBeVisible();
});
