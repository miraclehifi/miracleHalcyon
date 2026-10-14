import { expect, test, type Locator } from "@playwright/test";
import { waitForHydration } from "./support/hydration";
import { drag, isOpen, openList, total } from "./support/post-list";

// [TC-US09-01][SC-DELETE-01] 拖过 60% 行宽松手删除；抽屉里点"删除"同样删除；列表里不弹确认框
// 删除请求在 6 秒撤销期后发出（撤销见 post-list-delete-undo.spec.ts），用 page.clock 快进
test("[TC-US09-01] 从列表左滑删除（全滑 / 抽屉删除）", async ({ page, baseURL }) => {
  const { ids, row } = await openList(page, baseURL!, "W", ["Old Post", "Old Post 2", "Keep Post"], { clock: true });
  let dialogs = 0;
  page.on("dialog", (dialog) => {
    dialogs++;
    void dialog.dismiss();
  });
  const before = await total(page);

  const firstDelete = page.waitForRequest((r) => r.method() === "DELETE" && r.url().endsWith(`/api/admin/posts/${ids["Old Post"]}`));
  await drag(page, row("Old Post"), "full");
  await expect(row("Old Post")).toHaveCount(0);
  await expect.poll(() => total(page)).toBe(before - 1);
  await page.clock.runFor(6000);
  await firstDelete;

  const secondDelete = page.waitForRequest((r) => r.method() === "DELETE" && r.url().endsWith(`/api/admin/posts/${ids["Old Post 2"]}`));
  await drag(page, row("Old Post 2"), 120);
  await expect.poll(() => isOpen(row("Old Post 2"))).toBe(true);
  await row("Old Post 2").getByRole("button", { name: "删除" }).click();
  await expect(row("Old Post 2")).toHaveCount(0);
  await page.clock.runFor(6000);
  await secondDelete;

  await page.reload();
  await waitForHydration(page);
  await expect(row("Keep Post")).toBeVisible();
  await expect(row("Old Post")).toHaveCount(0);
  await expect(row("Old Post 2")).toHaveCount(0);
  expect((await page.request.get(`/api/admin/posts/${ids["Old Post"]}`)).status()).toBe(404);
  expect(dialogs).toBe(0);
});

// [TC-US09-16][SC-DELETE-09] 拖动打开 / 弹回 / 竖直不动；打开时点卡片只收起不跳转；拖另一行时前一行收起；"编辑"进入写文章页
test("[TC-US09-16] 滑动交互：拖动开合与不误跳转", async ({ page, baseURL }) => {
  const { ids, row } = await openList(page, baseURL!, "V", ["A", "B"]);

  await drag(page, row("A"), 100);
  await expect.poll(() => isOpen(row("A"))).toBe(true);
  await expect(page).toHaveURL(/\/admin\?q=/);

  await row("A").click({ position: { x: 40, y: 20 } }); // 卡片左移后仍露在外面的部分
  await expect.poll(() => isOpen(row("A"))).toBe(false);
  await expect(page).toHaveURL(/\/admin\?q=/);

  await drag(page, row("A"), 40);
  await page.waitForTimeout(400);
  expect(await isOpen(row("A"))).toBe(false);

  await drag(page, row("A"), 8, 120); // 竖直为主：不拖动
  expect(await row("A").evaluate((el) => el.hasAttribute("data-shifted") || el.hasAttribute("data-open"))).toBe(false);

  await drag(page, row("A"), 100);
  await expect.poll(() => isOpen(row("A"))).toBe(true);
  await drag(page, row("B"), 100);
  await expect.poll(async () => [await isOpen(row("A")), await isOpen(row("B"))]).toEqual([false, true]);

  await row("B").getByRole("link", { name: "编辑" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/posts/${ids.B}$`));
});

// [TC-US09-16][SC-DELETE-09] ⋯：悬停出现、点击开合；键盘 Enter 打开且焦点到"编辑"，Tab 到"删除"，Esc 收起回到 ⋯；
// 关闭时 Tab 跳过抽屉；打开时在 ⋯ 上按 Delete 删除；切换筛选后抽屉收起
test("[TC-US09-16] 滑动交互：⋯ 按钮与键盘", async ({ page, baseURL }) => {
  const { row } = await openList(page, baseURL!, "Y", ["A", "B", "C"]);
  const more = (name: string) => row(name).getByRole("button", { name: /的操作$/ });
  const opacity = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el.closest("[data-swipe-toggle]")!).opacity);

  await row("A").hover();
  await expect.poll(() => opacity(more("A"))).toBe("1");
  await more("A").click();
  await expect(more("A")).toHaveAttribute("aria-expanded", "true");
  await more("A").click();
  await expect(more("A")).toHaveAttribute("aria-expanded", "false");

  await row("B").getByRole("link").first().focus();
  await page.keyboard.press("Tab");
  await expect(more("B")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(row("B").getByRole("link", { name: "编辑" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(row("B").getByRole("button", { name: "删除" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(more("B")).toBeFocused();
  expect(await isOpen(row("B"))).toBe(false);

  // 关闭时跳过 B 的抽屉，进入下一行 A（列表顺序 C、B、A）：Chromium 到 A 的标题，WebKit 默认 Tab 不经过链接、到 A 的 ⋯
  await page.keyboard.press("Tab");
  await expect(row("A").locator(":focus")).toHaveCount(1);

  await more("C").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+Tab");
  await expect(more("C")).toBeFocused();
  await page.keyboard.press("Delete");
  await expect(row("C")).toHaveCount(0);

  await more("A").click();
  await expect.poll(() => isOpen(row("A"))).toBe(true);
  await page.getByRole("radio", { name: /草稿/ }).click();
  await expect(page).toHaveURL(/status=draft/);
  await expect.poll(() => isOpen(row("A"))).toBe(false);
});

// [TC-US09-16][SC-DELETE-09] 减弱动效：松手后 0.2 秒内归位
// @timing：在 *-timing 项目中单独运行（playwright.config.ts）
test("[TC-US09-16] 滑动交互：减弱动效时快速归位", { tag: "@timing" }, async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const { row } = await openList(page, baseURL!, "Z", ["A"]);
  await drag(page, row("A"), 40);
  await expect.poll(() => row("A").evaluate((el) => el.hasAttribute("data-shifted")), { timeout: 400 }).toBe(false);
});
