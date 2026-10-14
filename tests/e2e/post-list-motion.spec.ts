import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 造 3 篇同前缀的文章，按标题搜索只显示这 3 篇（列表按更新时间倒序：c、b、a）
async function openList(page: Page, baseURL: string, label: string) {
  await login(page);
  const prefix = `${label}${Date.now().toString(36)}`;
  const api = adminApi(page, baseURL);
  for (const name of ["a", "b", "c"]) await api.create({ title: `${prefix}-${name}` });
  await page.goto(`/admin?q=${prefix}`);
  await waitForHydration(page);
  return { prefix, titles: ["c", "b", "a"].map((name) => `${prefix}-${name}`) };
}

const rows = (page: Page) => page.locator("[role=list] > [data-index]");
const entrance = (page: Page) =>
  rows(page).evaluateAll((items) =>
    items.map((item) => ({ state: (item as HTMLElement).dataset.state, delay: parseFloat((item as HTMLElement).style.transitionDelay) || 0 })),
  );

// [SC-POSTLIST-01] 入场：逐行弹入，错开 50ms；筛选后整页重新入场（components.md"列表动效参数"）
test("[US-07 入场] 卡片逐行弹入且错开 50ms，筛选后重新入场", async ({ page, baseURL }) => {
  await openList(page, baseURL!, "E");
  await expect(rows(page)).toHaveCount(3);
  await expect.poll(() => entrance(page)).toEqual([
    { state: "in", delay: 0 },
    { state: "in", delay: 0.05 },
    { state: "in", delay: 0.1 },
  ]);

  await page.locator("[role=list]").evaluate((list) => list.setAttribute("data-marker", "before"));
  await page.getByRole("radio", { name: /草稿/ }).click();
  await expect(page).toHaveURL(/status=draft/);
  await expect(page.locator("[role=list][data-marker]")).toHaveCount(0);
  await expect.poll(() => entrance(page)).toEqual([
    { state: "in", delay: 0 },
    { state: "in", delay: 0.05 },
    { state: "in", delay: 0.1 },
  ]);
});

// [SC-POSTLIST-01] 减弱动效：只渐显透明度，不位移、不缩放、不错开
test("[US-07 入场] prefers-reduced-motion 时只渐显、不错开", async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openList(page, baseURL!, "R");
  await expect.poll(() => entrance(page)).toEqual(new Array(3).fill({ state: "in", delay: 0 }));
  const transforms = await rows(page).evaluateAll((items) => items.map((item) => (item as HTMLElement).style.transform));
  expect(transforms).toEqual(["", "", ""]);
});

// [SC-POSTLIST-02] 焦点在列表内：↑ / ↓ / Home / End 移到对应卡片的标题链接，到头不循环；同一时间只有该行处于悬停态
test("[US-07 键盘] 方向键在卡片间移动焦点", async ({ page, baseURL }) => {
  const { titles } = await openList(page, baseURL!, "K");
  const link = (i: number) => page.getByRole("link", { name: titles[i] });
  const activeTitles = () => page.locator("[data-active] a").allTextContents();
  await page.mouse.move(0, 0);
  await link(0).focus();

  const steps: [string, number][] = [
    ["ArrowDown", 1],
    ["ArrowDown", 2],
    ["ArrowDown", 2],
    ["Home", 0],
    ["End", 2],
    ["ArrowUp", 1],
  ];
  for (const [key, expected] of steps) {
    await page.keyboard.press(key);
    await expect(link(expected), key).toBeFocused();
    expect(await activeTitles(), key).toEqual([titles[expected]]);
  }
});

// [SC-POSTLIST-02] 焦点不在列表内时方向键照常滚动页面，不移动焦点
test("[US-07 键盘] 焦点不在列表内时方向键滚动页面", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1280, height: 360 });
  await openList(page, baseURL!, "S");
  await page.mouse.move(640, 200); // 指针停在列表上方区域也不影响
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const before = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("ArrowDown");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});
