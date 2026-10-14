import { expect, type Locator, type Page } from "@playwright/test";
import { adminApi, login } from "./admin";
import { waitForHydration } from "./hydration";

// 造同前缀的文章并按标题搜索，只显示这几篇（列表按更新时间倒序）。
// clock：进入列表前安装 page.clock（不暂停，动画照常播放），用 runFor 快进撤销期
export async function openList(page: Page, baseURL: string, label: string, names: string[], { clock = false } = {}) {
  await login(page);
  const prefix = `${label}${Date.now().toString(36)}`;
  const api = adminApi(page, baseURL);
  const ids: Record<string, string> = {};
  for (const name of names) ids[name] = await api.create({ title: `${prefix} ${name}` });
  if (clock) await page.clock.install();
  await page.goto(`/admin?q=${encodeURIComponent(prefix)}`);
  await waitForHydration(page);
  await entranceDone(page);
  const row = (name: string) => page.getByRole("group", { name: `《${prefix} ${name}》` });
  return { prefix, ids, row, api };
}

// 等入场动效（CSS transition，弹入时有缩放）播完，否则量到的行宽偏小；
// 被取消的动画（如行被移除、样式被替换）finished 会以 AbortError 拒绝，也算结束
export async function entranceDone(page: Page) {
  await page
    .locator("[role=list]")
    .evaluate((list) => Promise.all(list.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => undefined))).then(() => undefined));
}

// 用鼠标从卡片右侧（避开 ⋯）按住向左慢拖 dx 像素，停住再松手（不算甩动）；dy 为竖直分量；
// dx = "full" 时拖过行宽（阻尼下露出超过 60% 行宽）。
// Playwright 的连续 move 之间几乎没有时间间隔，不停顿时任何拖动都会被算成甩动
export async function drag(page: Page, row: Locator, dx: number | "full", dy = 0) {
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
export async function settled(row: Locator) {
  const offset = () => row.evaluate((el) => (el.querySelector(":scope > div > div") as HTMLElement).style.transform);
  await expect
    .poll(async () => {
      const before = await offset();
      await row.page().waitForTimeout(50);
      return before === (await offset());
    })
    .toBe(true);
}

// 经 ⋯ 打开抽屉点"删除"
export async function deleteViaDrawer(row: Locator) {
  await row.getByRole("button", { name: /的操作$/ }).click();
  await expect.poll(() => isOpen(row)).toBe(true);
  await row.getByRole("button", { name: "删除" }).click();
  await expect(row).toHaveCount(0);
}

export const isOpen = (row: Locator) => row.evaluate((el) => el.hasAttribute("data-open"));
export const total = async (page: Page) => Number((await page.getByText(/^共 \d+ 篇$/).textContent())!.match(/\d+/)![0]);
// 当前列表各行的读屏名称（《标题》），按显示顺序
export const rowNames = (page: Page) => page.locator("[role=list] [role=group]").evaluateAll((groups) => groups.map((g) => g.getAttribute("aria-label")));

// 记录删除请求（按文章 id）
export function trackDeletes(page: Page) {
  const ids: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "DELETE") ids.push(request.url().split("/").pop()!);
  });
  return ids;
}
