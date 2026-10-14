import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 造同前缀的文章并按标题搜索，只显示这几篇（列表按更新时间倒序）
async function openList(page: Page, baseURL: string, label: string, names: string[]) {
  await login(page);
  const prefix = `${label}${Date.now().toString(36)}`;
  const api = adminApi(page, baseURL);
  const ids: Record<string, string> = {};
  for (const name of names) ids[name] = await api.create({ title: `${prefix} ${name}` });
  await page.goto(`/admin?q=${encodeURIComponent(prefix)}`);
  await waitForHydration(page);
  // 等入场动效（CSS transition，弹入时有缩放）播完，否则量到的行宽偏小
  await page.locator("[role=list]").evaluate((list) => Promise.all(list.getAnimations({ subtree: true }).map((a) => a.finished)).then(() => undefined));
  const row = (name: string) => page.getByRole("group", { name: `《${prefix} ${name}》` });
  return { prefix, ids, row };
}

// 用鼠标从卡片右侧（避开 ⋯）按住向左慢拖 dx 像素，停住再松手（不算甩动）；dy 为竖直分量；
// dx = "full" 时拖过行宽（阻尼下露出超过 60% 行宽）。
// Playwright 的连续 move 之间几乎没有时间间隔，不停顿时任何拖动都会被算成甩动
async function drag(page: Page, row: Locator, dx: number | "full", dy = 0) {
  await settled(row);
  const box = (await row.boundingBox())!;
  const distance = dx === "full" ? box.width + 60 : dx;
  const start = { x: box.x + box.width - 90, y: box.y + box.height / 2 };
  const end = { x: start.x - distance, y: start.y + dy };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(start.x - (distance * i) / 10, start.y + (dy * i) / 10);
    await page.waitForTimeout(16);
  }
  // 停住：末尾几次 move 只差 1px，松手时速度接近 0
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(end.x + (i % 2), end.y);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
}

// 拖动面停稳（上一次开合的弹簧动画播完）：间隔一帧以上两次读到的位移相同
async function settled(row: Locator) {
  const offset = () => row.evaluate((el) => (el.querySelector(":scope > div > div") as HTMLElement).style.transform);
  await expect
    .poll(async () => {
      const before = await offset();
      await row.page().waitForTimeout(50);
      return before === (await offset());
    })
    .toBe(true);
}

const isOpen = (row: Locator) => row.evaluate((el) => el.hasAttribute("data-open"));
const total = async (page: Page) => Number((await page.getByText(/^共 \d+ 篇$/).textContent())!.match(/\d+/)![0]);

// [TC-US09-01][SC-DELETE-01] 拖过 60% 行宽松手删除；抽屉里点"删除"同样删除；列表里不弹确认框
test("[TC-US09-01] 从列表左滑删除（全滑 / 抽屉删除）", async ({ page, baseURL }) => {
  const { ids, row } = await openList(page, baseURL!, "W", ["Old Post", "Old Post 2", "Keep Post"]);
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
  await firstDelete;

  const secondDelete = page.waitForRequest((r) => r.method() === "DELETE" && r.url().endsWith(`/api/admin/posts/${ids["Old Post 2"]}`));
  await drag(page, row("Old Post 2"), 120);
  await expect.poll(() => isOpen(row("Old Post 2"))).toBe(true);
  await row("Old Post 2").getByRole("button", { name: "删除" }).click();
  await expect(row("Old Post 2")).toHaveCount(0);
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
