import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 写文章页"删除文章"（admin-post-editor.md"设置抽屉""弹层与提示"）：设置抽屉底部 → 确认框 → DELETE → 回到列表
async function openEditor(page: Page, baseURL: string, testInfo: { project: { name: string } }, title: string) {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${testInfo.project.name[0]}`;
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `${title} ${run}`, slug: `del-${run}`, body: "B1" });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  await page.getByRole("button", { name: "设置" }).click();
  return { id, title: `${title} ${run}` };
}

const deleteButton = (page: Page) => page.getByRole("complementary", { name: "文章设置" }).getByRole("button", { name: "删除文章" });

// DELETE 请求计数（不拦截）
function trackDeletes(page: Page, id: string) {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "DELETE" && request.url().endsWith(`/api/admin/posts/${id}`)) calls.push(request.url());
  });
  return calls;
}

// [TC-US09-02][SC-DELETE-02] 含未保存修改时删除：回到列表、不弹离开确认、之后不再自动保存
test("[TC-US09-02] 写文章页删除后回到列表", async ({ page, baseURL }, testInfo) => {
  const { id, title } = await openEditor(page, baseURL!, testInfo, "Old Post");
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  const saves: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "PUT" && request.url().endsWith(`/api/admin/posts/${id}`)) saves.push(request.url());
  });

  await page.getByRole("textbox", { name: "正文" }).fill("B1 未保存");
  await deleteButton(page).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "确认删除" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await waitForHydration(page);
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  await page.waitForTimeout(2500); // 超过自动保存防抖
  expect({ dialogs, saves }).toEqual({ dialogs: [], saves: [] });
  expect((await page.request.get(`/api/admin/posts/${id}`)).status()).toBe(404);
});

// [TC-US09-10][TC-US09-11][SC-DELETE-01][SC-DELETE-03] 确认框文案与转义、焦点默认"取消"；取消 / Esc / 遮罩关闭后焦点回到"删除文章"，不发请求
test("[TC-US09-10][TC-US09-11] 确认框文案、取消与 Esc", async ({ page, baseURL }, testInfo) => {
  const { id, title } = await openEditor(page, baseURL!, testInfo, "<img src=x onerror=alert(1)>");
  const deletes = trackDeletes(page, id);
  page.on("dialog", () => {
    throw new Error("XSS executed");
  });
  const dialog = page.getByRole("alertdialog", { name: `删除《${title}》？` });

  // 键盘打开（WebKit 鼠标点击按钮不聚焦，焦点还原针对键盘用户）
  await deleteButton(page).focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toContainText("删除后无法恢复。已发布的文章读者将无法再访问。");
  await expect(dialog.getByRole("button", { name: "取消" })).toBeFocused();
  await page.keyboard.press("Enter"); // "取消"
  await expect(dialog).toBeHidden();
  await expect(deleteButton(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(deleteButton(page)).toBeFocused();

  await deleteButton(page).click();
  await page.getByTestId("confirm-dialog-scrim").click({ position: { x: 5, y: 5 } });
  await expect(dialog).toBeHidden();

  expect(deletes).toEqual([]);
  expect((await page.request.get(`/api/admin/posts/${id}`)).status()).toBe(200);
});

// [TC-US09-12][SC-DELETE-01] 删除接口延迟时："确认删除"加载并禁用，重复点击 / Enter 只发 1 次
test("[TC-US09-12] 确认删除进行中防重复提交", async ({ page, baseURL }, testInfo) => {
  const { id } = await openEditor(page, baseURL!, testInfo, "Slow");
  const deletes = trackDeletes(page, id);
  await page.route(`**/api/admin/posts/${id}`, async (route) => {
    if (route.request().method() !== "DELETE") return route.fallback();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.fallback();
  });

  await deleteButton(page).click();
  const confirm = page.getByRole("alertdialog").getByRole("button", { name: "确认删除" });
  await confirm.click();
  await expect(confirm).toBeDisabled();
  await confirm.click({ force: true });
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin$/);
  expect(deletes).toHaveLength(1);
  await expect(page.getByRole("alert").filter({ hasText: "删除失败" })).toHaveCount(0);
});

// [TC-US09-05][SC-DELETE-06] 删除接口 500：提示"删除失败，请重试"，留在写文章页、内容不丢；取消拦截后重试成功
test("[TC-US09-05] 写文章页删除失败时提示且文章保留", async ({ page, baseURL }, testInfo) => {
  const { id } = await openEditor(page, baseURL!, testInfo, "Fail");
  const fail = (route: import("@playwright/test").Route) =>
    route.request().method() === "DELETE" ? route.fulfill({ status: 500, body: "oops" }) : route.fallback();
  await page.route(`**/api/admin/posts/${id}`, fail);

  await page.getByRole("textbox", { name: "正文" }).fill("B1 改过");
  await deleteButton(page).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "确认删除" }).click();

  await expect(page.getByRole("alert").filter({ hasText: "删除失败，请重试" })).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${id}$`));
  await expect(page.getByRole("textbox", { name: "正文" })).toHaveValue("B1 改过");
  await expect(page.getByRole("banner").getByText("已保存")).toBeVisible(); // 恢复自动保存，补存期间的修改

  await page.unroute(`**/api/admin/posts/${id}`, fail);
  await deleteButton(page).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "确认删除" }).click();
  await expect(page).toHaveURL(/\/admin$/);
});

// 新建且从未保存过的文章不显示"删除文章"
test("新建文章不显示删除", async ({ page }) => {
  await login(page);
  await page.goto("/admin/posts/new");
  await waitForHydration(page);
  await expect(page.getByRole("complementary", { name: "文章设置" })).toBeVisible();
  await expect(deleteButton(page)).toHaveCount(0);
});
