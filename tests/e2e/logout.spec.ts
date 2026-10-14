import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 后台登出入口（US-02）：列表页顶栏"登出"、写文章页顶栏 ⋯ 菜单"登出"；有未保存修改先确认
const sessionCookie = async (page: Page) => (await page.context().cookies()).find((cookie) => cookie.name === "mh_session");
const logoutRequests = (page: Page) => {
  const calls: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/admin/logout")) calls.push(request.method());
  });
  return calls;
};

async function openEditor(page: Page, baseURL: string, label: string) {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `${label} ${run}`, slug: `logout-${run}`, body: "基线" });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  return { id, title: `${label} ${run}` };
}

const logoutFromEditor = async (page: Page) => {
  await page.getByRole("banner").getByRole("button", { name: "更多操作" }).click();
  await page.getByRole("menuitem", { name: "登出" }).click();
};

// [TC-US02-02][TC-US02-12][SC-LOGOUT-01] 列表页登出 → 登录页、Cookie 清除；后台页面 no-store，"后退"看不到后台内容
test("[TC-US02-02][TC-US02-12] 列表页登出与后退", async ({ page, baseURL }) => {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await login(page);
  const secret = `secret-draft-${run}`;
  await adminApi(page, baseURL!).create({ title: secret, slug: `secret-${run}` });
  const response = await page.goto("/admin");
  expect(response?.headers()["cache-control"]).toBe("no-store");
  await waitForHydration(page);
  await expect(page.getByText(secret)).toBeVisible();

  await page.getByRole("banner").getByRole("button", { name: "登出" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(await sessionCookie(page)).toBeUndefined();

  await page.goBack();
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByText(secret)).toHaveCount(0);
});

// [TC-US02-02][TC-US02-15][TC-US02-16][SC-LOGOUT-01][SC-LOGOUT-03] 写文章页：修改已保存后从 ⋯ 菜单登出，不弹确认
test("[TC-US02-15][TC-US02-16] 写文章页无未保存修改直接登出", async ({ page, baseURL }) => {
  await openEditor(page, baseURL!, "已保存");
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  await page.getByRole("textbox", { name: "正文" }).fill("基线+已保存");
  await expect(page.getByRole("banner").getByText("已保存")).toBeVisible();

  await logoutFromEditor(page);
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect({ dialogs, cookie: await sessionCookie(page) }).toEqual({ dialogs: [], cookie: undefined });
});

// [TC-US02-13][TC-US02-14][SC-LOGOUT-03] 有未保存修改：确认框；取消留在原页、不登出；确认后登出，无浏览器离开提示，回来可恢复
test("[TC-US02-13][TC-US02-14] 有未保存修改时登出先确认", async ({ page, baseURL }) => {
  const { id } = await openEditor(page, baseURL!, "未保存");
  await page.route(`**/api/admin/posts/${id}`, (route) => (route.request().method() === "PUT" ? new Promise(() => {}) : route.fallback())); // 保存挂起，保持未保存
  const calls = logoutRequests(page);
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  const editor = page.getByRole("textbox", { name: "正文" });
  await editor.fill("基线+未保存内容");

  await logoutFromEditor(page);
  const confirm = page.getByRole("alertdialog", { name: "有未保存的修改，确定登出吗？" });
  await expect(confirm).toContainText("未保存的内容会暂存在本机，下次打开这篇文章时可以恢复。");
  await confirm.getByRole("button", { name: "取消" }).click();
  await expect(confirm).toBeHidden();
  await expect(editor).toHaveValue("基线+未保存内容");
  expect(calls).toEqual([]);

  await logoutFromEditor(page);
  await confirm.getByRole("button", { name: "登出" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect({ calls, dialogs, cookie: await sessionCookie(page) }).toEqual({ calls: ["POST"], dialogs: [], cookie: undefined });

  await page.unroute(`**/api/admin/posts/${id}`);
  await login(page);
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  await expect(page.getByRole("button", { name: "恢复本地内容" })).toBeVisible();
});
