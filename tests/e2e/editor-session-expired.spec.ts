import { expect, test, type Page } from "@playwright/test";
import { adminApi, login, PASSWORD, USERNAME } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 会话过期（editor module-spec §2 状态机 401、UI 决定 #3）：保存或发布返回 401 → 内容暂存本地 → 跳 /admin/login?next=当前地址，
// 不弹离开确认；登录后回到写文章页，恢复横幅找回内容。会话失效用清 Cookie 模拟
async function openPost(page: Page, baseURL: string, label: string) {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `${label} ${run}`, slug: `expired-${run}`, body: "基线" });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  return id;
}

async function loginHere(page: Page) {
  await waitForHydration(page);
  await page.getByLabel("账号").fill(USERNAME);
  await page.getByLabel("密码").fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
}

const loginUrl = (id: string) => new RegExp(`/admin/login\\?next=${encodeURIComponent(`/admin/posts/${id}`)}$`);
const body = (page: Page) => page.getByRole("textbox", { name: "正文" });

// [TC-US06-18][SC-AUTOSAVE-10] 自动保存 401：暂存、跳登录页；登录后回到原文章，恢复本地内容后保存成功
test("[TC-US06-18] 会话过期：暂存、跳登录页、登录后恢复并保存", async ({ page, context, baseURL }) => {
  const id = await openPost(page, baseURL!, "过期");
  const dialogs: string[] = [];
  page.on("dialog", (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });

  await context.clearCookies();
  await body(page).fill("基线+过期后输入");
  await expect(page).toHaveURL(loginUrl(id));
  const stash = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null") as { content: { body: string } } | null, `mh:draft:${id}`);
  expect({ dialogs, body: stash?.content.body }).toEqual({ dialogs: [], body: "基线+过期后输入" });

  await loginHere(page);
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${id}$`));
  await waitForHydration(page);
  await expect(body(page)).toHaveValue("基线");
  await page.getByRole("button", { name: "恢复本地内容" }).click();
  await expect(body(page)).toHaveValue("基线+过期后输入");
  await expect(page.getByRole("banner").getByText("已保存")).toBeVisible();
  expect(((await (await page.request.get(`/api/admin/posts/${id}`)).json()) as { body: string }).body).toBe("基线+过期后输入");
});

// [TC-US06-25][SC-AUTOSAVE-10] 发布返回 401 同样跳登录页（无未保存修改，登录回来不出现恢复横幅）
test("[TC-US06-25] 发布时会话过期跳登录页", async ({ page, context, baseURL }) => {
  const id = await openPost(page, baseURL!, "发布过期");
  await context.clearCookies();
  await page.getByRole("banner").getByRole("button", { name: "发布", exact: true }).click();
  await expect(page).toHaveURL(loginUrl(id));

  await loginHere(page);
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${id}$`));
  await waitForHydration(page);
  await expect(page.getByRole("button", { name: "恢复本地内容" })).toHaveCount(0);
});
