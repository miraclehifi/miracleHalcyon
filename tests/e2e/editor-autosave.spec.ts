import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// [TC-US06][SC-AUTOSAVE] 新建页输入正文，停止 2 秒后自动保存：显示"已保存 · HH:mm"，地址换成 /admin/posts/:id，刷新后内容仍在
test("[TC-US06] 停止输入 2 秒后自动保存并换成编辑地址", async ({ page }, testInfo) => {
  const title = `A${Date.now().toString(36)}${testInfo.project.name[0]} 自动保存`;
  await login(page);
  await page.goto("/admin/posts/new");
  await waitForHydration(page);

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
  await page.clock.install();
  await page.goto("/admin/posts/new");
  await waitForHydration(page);
  // 暂停页面计时器：2 秒防抖永远不会触发，发出的保存请求只能来自快捷键（不依赖并行负载下不可靠的时间窗）
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  await page.getByRole("textbox", { name: "正文" }).fill("立即保存");
  await expect(page.getByRole("banner").getByRole("status")).toHaveText("未保存");
  const request = page.waitForRequest((r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/admin/posts");
  await page.keyboard.press("ControlOrMeta+s");
  await request;
  await expect(page).toHaveURL(/\/admin\/posts\/\d+$/);
  await expect(page.getByRole("banner").getByRole("status")).toHaveText(/^已保存/);
});

// [TC-US06-26][SC-AUTOSAVE-09] "未保存""保存中…"时离开触发浏览器离开确认；取消后页面与内容保留
test.describe("[TC-US06-26] 未完成保存时离开弹确认", () => {
  async function openDraft(page: Page, baseURL: string, title: string) {
    await login(page);
    const id = await adminApi(page, baseURL).create({ title, body: "原正文" });
    await page.clock.install();
    await page.goto(`/admin/posts/${id}`);
    await waitForHydration(page);
    // 暂停页面计时器：2 秒防抖不会触发，"未保存"状态保持到离开
    await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
    const body = page.getByRole("textbox", { name: "正文" });
    await body.click(); // 真实点击与键入：浏览器只对有过用户交互的页面弹离开确认
    await page.keyboard.type("+改动");
    return body;
  }

  const nextDialog = (page: Page) => page.waitForEvent("dialog");
  const status = (page: Page) => page.getByRole("banner").getByRole("status");

  test("a. 未保存时关闭页面", async ({ page, baseURL }, testInfo) => {
    const body = await openDraft(page, baseURL!, `L${Date.now().toString(36)}${testInfo.project.name[0]} a`);
    await expect(status(page)).toHaveText("未保存");
    const dialog = nextDialog(page);
    await page.close({ runBeforeUnload: true });
    expect((await dialog).type()).toBe("beforeunload");
    await (await dialog).dismiss();
    expect(page.isClosed()).toBe(false);
    await expect(body).toHaveValue("原正文+改动");
  });

  test("b. 未保存时后退", async ({ page, baseURL }, testInfo) => {
    const body = await openDraft(page, baseURL!, `L${Date.now().toString(36)}${testInfo.project.name[0]} b`);
    const url = page.url();
    await expect(status(page)).toHaveText("未保存");
    const dialog = nextDialog(page);
    const back = page.goBack({ timeout: 5000 }).catch(() => null); // 取消后导航不会完成
    expect((await dialog).type()).toBe("beforeunload");
    await (await dialog).dismiss();
    await back;
    expect(page.url()).toBe(url);
    await expect(body).toHaveValue("原正文+改动");
  });

  test("c. 保存中时关闭页面", async ({ page, baseURL }, testInfo) => {
    const body = await openDraft(page, baseURL!, `L${Date.now().toString(36)}${testInfo.project.name[0]} c`);
    await page.route("**/api/admin/posts/*", async (route) => {
      if (route.request().method() !== "PUT") return route.continue();
      await new Promise((resolve) => setTimeout(resolve, 10_000)); // 挂起保存请求，停在"保存中…"
      await route.continue().catch(() => {});
    });
    await page.keyboard.press("ControlOrMeta+s");
    await expect(status(page)).toHaveText("保存中…");
    const dialog = nextDialog(page);
    await page.close({ runBeforeUnload: true });
    expect((await dialog).type()).toBe("beforeunload");
    await (await dialog).dismiss();
    expect(page.isClosed()).toBe(false);
    await expect(body).toHaveValue("原正文+改动");
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });
});
