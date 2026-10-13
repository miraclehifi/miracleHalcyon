import { expect, test } from "@playwright/test";
import { login } from "./support/admin";

// [TC-US06][SC-AUTOSAVE] 新建页输入正文，停止 2 秒后自动保存：显示"已保存 · HH:mm"，地址换成 /admin/posts/:id，刷新后内容仍在
test("[TC-US06] 停止输入 2 秒后自动保存并换成编辑地址", async ({ page }, testInfo) => {
  const title = `A${Date.now().toString(36)}${testInfo.project.name[0]} 自动保存`;
  await login(page);
  await page.goto("/admin/posts/new");
  await page.waitForSelector("astro-island:not([ssr])");

  await page.getByRole("textbox", { name: "标题" }).fill(title);
  await page.getByRole("textbox", { name: "正文" }).fill("第一段正文");
  const status = page.getByRole("banner").getByRole("status");
  await expect(status).toHaveText("未保存");
  await expect(status).toHaveText(/^已保存 · \d{2}:\d{2}$/, { timeout: 5000 });
  await expect(page).toHaveURL(/\/admin\/posts\/\d+$/);

  await page.reload();
  await expect(page.getByRole("textbox", { name: "标题" })).toHaveValue(title);
  await expect(page.getByRole("textbox", { name: "正文" })).toHaveValue("第一段正文");
});

// [TC-US03-18][SC-POSTINFO-02] Ctrl / ⌘ + S 立即保存，地址换成编辑地址
test("[TC-US03-18] Ctrl/Cmd+S 立即保存", async ({ page }) => {
  await login(page);
  await page.goto("/admin/posts/new");
  await page.waitForSelector("astro-island:not([ssr])");
  await page.getByRole("textbox", { name: "正文" }).fill("立即保存");
  await page.keyboard.press("ControlOrMeta+s");
  await expect(page).toHaveURL(/\/admin\/posts\/\d+$/, { timeout: 1500 });
  await expect(page.getByRole("banner").getByRole("status")).toHaveText(/^已保存/);
});
