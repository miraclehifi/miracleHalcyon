import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { waitForHydration } from "./support/hydration";

// 书影音读者页（reader-media.md，US-03）。数据：reader-fixture.shelf.json（US-03 测试数据表），封面由 e2e:seed 写入本地 R2；
// 游戏封面是 images.igdb.com 外链，由 routeIgdb 冒充（co8h3y / co5vmg / cobg300 返回夹具图片，其余 404），不出网
const IGDB_FIXTURES: Record<string, Buffer> = {
  co8h3y: readFileSync("tests/fixtures/igdb/co8h3y-810x1080.jpg"),
  co5vmg: readFileSync("tests/fixtures/igdb/co5vmg-811x1080.jpg"),
  cobg300: readFileSync("tests/fixtures/igdb/cobg300-600x900.jpg"),
};
const routeIgdb = (page: Page) =>
  page.route("https://images.igdb.com/**", (route) => {
    const body = IGDB_FIXTURES[/\/(\w+)\.jpg$/.exec(route.request().url())?.[1] ?? ""];
    return body ? route.fulfill({ contentType: "image/jpeg", body }) : route.fulfill({ status: 404 });
  });
const tabs = (page: Page) => page.getByRole("navigation", { name: "书影音分类" });
const card = (page: Page, title: string) => page.getByRole("button", { name: `《${title}》` });
const poster = (page: Page, title: string) => page.locator("[data-poster-wall] [data-poster]").filter({ has: card(page, title) });
const item = (page: Page, title: string) => page.locator("li[data-media-item]").filter({ has: page.locator("[data-media-title]", { hasText: title }) });

// [TC-US03-01][SC-SHELF-01] 顶栏进入 /media，默认书
test("[TC-US03-01] 顶栏进入 /media，默认书", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation").getByRole("link", { name: "书影音" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/media$/);
  await expect(tabs(page).getByRole("link", { name: "书" })).toHaveAttribute("aria-current", "page");
  await expect(item(page, "原则")).toBeVisible();
  await expect(page.locator("header").getByRole("link", { name: "书影音" }).filter({ visible: true })).toHaveAttribute("aria-current", "page");
});

// [TC-US03-02][SC-SHELF-02][SC-SHELF-13] 点分类：水滴动画后跳转；后退回书；直接打开分类地址
test("[TC-US03-02] 分类切换与直接访问分类地址", async ({ page }) => {
  await page.goto("/media");
  await waitForHydration(page);
  await tabs(page).getByRole("link", { name: "电影" }).click();
  await page.waitForURL(/\/media\/movie$/);
  await expect(tabs(page).getByRole("link", { name: "电影" })).toHaveAttribute("aria-current", "page");
  await expect(tabs(page).getByRole("link", { name: "书" })).not.toHaveAttribute("aria-current", "page");
  await expect(page.locator("[data-poster-wall] [data-poster]")).toHaveCount(2);
  await page.goBack();
  await expect(page).toHaveURL(/\/media$/);
  await expect(item(page, "原则")).toBeVisible();
  await page.goto("/media/series");
  await waitForHydration(page);
  await expect(tabs(page).getByRole("link", { name: "剧集" })).toHaveAttribute("aria-current", "page");
  await expect(page.locator("[data-poster-wall] [data-poster]")).toHaveCount(3);
});

// [TC-US03-06][SC-SHELF-06][SC-SHELF-07] 桌游：有评分与无评分两行的年月列左缘对齐（桌游改海报墙见任务 16）
test("[TC-US03-06] 列表行无评分时年月列对齐", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/media/boardgame");
  await expect(item(page, "卡坦岛").getByRole("img", { name: "评分 5 / 5" })).toBeVisible();
  await expect(item(page, "无评桌游").getByRole("img", { name: /评分/ })).toHaveCount(0);
  const x = async (title: string) => (await item(page, title).locator("[data-media-date]").boundingBox())!.x;
  expect(Math.abs((await x("卡坦岛")) - (await x("无评桌游")))).toBeLessThanOrEqual(1);
});

// [TC-US03-09][SC-SHELF-14] 未知分类、已去掉的分类、/media/book 都是 404
test("[TC-US03-09] 未知分类回退 404", async ({ page }) => {
  for (const path of ["/media/music", "/media/anime", "/media/book"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

// [TC-US03-10][SC-SHELF-16] 切换全部分类、滚到底，不请求豆瓣域名；站外图片只有游戏页的 images.igdb.com
test("[TC-US03-10] 不请求豆瓣域名", async ({ page }) => {
  await routeIgdb(page);
  const external: string[] = [];
  let path = "";
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) external.push(`${path} ${url.hostname} ${request.resourceType()}`);
  });
  for (path of ["/media", "/media/comic", "/media/movie", "/media/series", "/media/game", "/media/boardgame"]) {
    await page.goto(path);
    await page.mouse.wheel(0, 10_000);
    await page.waitForLoadState("networkidle");
  }
  expect(external.filter((line) => /(^|[ .])(douban\.com|doubanio\.com) /.test(line))).toEqual([]);
  expect(new Set(external)).toEqual(new Set(["/media/game images.igdb.com image"]));
});

// [TC-US03-15][SC-SHELF-11] 无封面与封面 404 显示占位，尺寸与正常封面相同
test("[TC-US03-15] 封面缺失 / 加载失败占位", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/media");
  const normal = item(page, "原则").locator("img");
  await expect(normal).toHaveJSProperty("complete", true);
  expect(await normal.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  const missing = item(page, "手记").getByRole("img", { name: "图片不可用" });
  await expect(missing).toBeVisible();
  const [a, b] = [(await normal.boundingBox())!, (await missing.boundingBox())!];
  expect([b.width, b.height]).toEqual([a.width, a.height]);

  // 海报墙（MediaPoster/Front）：封面 404 → 占位底 + 图标 + 片名，尺寸与正常海报相同
  await page.goto("/media/movie");
  await waitForHydration(page);
  const broken = poster(page, "无名片");
  await expect(broken.getByRole("img", { name: "图片不可用" })).toBeVisible();
  await expect(broken.getByRole("img", { name: "图片不可用" })).toContainText("无名片");
  // 入场有 0.96 → 1 的缩放，等两张都落定再比
  const size = async (l: ReturnType<typeof poster>) => {
    const box = (await l.boundingBox())!;
    return [Math.round(box.width), Math.round(box.height)];
  };
  await expect.poll(async () => JSON.stringify(await size(broken)) === JSON.stringify(await size(poster(page, "肖申克的救赎")))).toBe(true);
});

// [TC-US03-16][SC-SHELF-12] 空分类空状态（夹具中漫画为空）
test("[TC-US03-16] 空分类空状态", async ({ page }) => {
  await page.goto("/media");
  await waitForHydration(page);
  await tabs(page).getByRole("link", { name: "漫画" }).click();
  await page.waitForURL(/\/media\/comic$/);
  await expect(page.getByText("还没有记录漫画")).toBeVisible();
  await expect(page.locator("[data-media-count]")).toHaveText("0 本");
  await expect(page.locator("li[data-media-item]")).toHaveCount(0);
});

// [TC-US03-17][SC-SHELF-15] 手机 390：无横向滚动；分类标签换行全部可见（GooeyNav 不横滑）；行封面 44×66；书卡片单列；游戏海报墙 2 列
test("[TC-US03-17] 手机 390px 布局", async ({ page }) => {
  await routeIgdb(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/media");
  // 水合后 GooeyNav 画布（外扩 72px）才出现，量宽要等它
  await waitForHydration(page);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const [first, second] = [(await item(page, "三体").boundingBox())!, (await item(page, "原则").boundingBox())!];
  expect(second.y).toBeGreaterThan(first.y + first.height - 1);
  await expect(tabs(page).getByRole("link", { name: "桌游" })).toBeInViewport();

  await page.goto("/media/boardgame");
  await waitForHydration(page);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const cover = (await item(page, "卡坦岛").locator("img").boundingBox())!;
  expect([Math.round(cover.width), Math.round(cover.height)]).toEqual([44, 66]);

  await page.goto("/media/game");
  await waitForHydration(page);
  await expect.poll(() => columnsOfFirstRow(page)).toBe(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

// 海报墙第一排有几张（入场动画结束后 y 相同）
const columnsOfFirstRow = (page: Page) =>
  page.locator("[data-poster-wall] [data-poster]").evaluateAll((els) => {
    const ys = els.map((el) => Math.round(el.getBoundingClientRect().y));
    return ys.filter((y) => y === Math.min(...ys)).length;
  });

// [TC-US03-18][SC-SHELF-02] 分类导航是链接：Tab 可聚焦、Enter 跳转
test("[TC-US03-18] 分类标签键盘操作与可访问性", async ({ page }) => {
  await page.goto("/media");
  await waitForHydration(page);
  await expect(tabs(page).getByRole("link", { name: "书" })).toHaveAttribute("aria-current", "page");
  const game = tabs(page).getByRole("link", { name: "游戏" });
  await game.focus();
  await expect(game).toBeFocused();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/media\/game$/);
  await expect(tabs(page).getByRole("link", { name: "游戏" })).toHaveAttribute("aria-current", "page");
});

// [TC-US03-19][SC-SHELF-19] 海报墙：悬停片名、点击翻面、豆瓣新标签、只翻一张、Esc、键盘 Enter
test("[TC-US03-19] 海报墙悬停无片名浮层与翻面看详情", async ({ page, context }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/media/movie");
  await waitForHydration(page);
  const shawshank = card(page, "肖申克的救赎");
  await expect(page.locator("[data-poster-wall] [data-poster]")).toHaveCount(2);
  await expect(shawshank).toHaveAttribute("aria-pressed", "false");
  const link = poster(page, "肖申克的救赎").locator("a[data-douban-link]");
  await expect(link).toHaveAttribute("tabindex", "-1");
  await expect(poster(page, "肖申克的救赎").locator("[data-poster-front]")).not.toContainText("在看");

  // 1 悬停：无片名浮层（poster-no-hover-title）
  await shawshank.hover();
  await expect(poster(page, "肖申克的救赎").locator("[data-poster-caption]")).toHaveCount(0);
  // 2 点击翻面：背面详情，无导演
  await shawshank.click();
  await expect(shawshank).toHaveAttribute("aria-pressed", "true");
  const back = poster(page, "肖申克的救赎").locator("[data-poster-back]");
  await expect(back).toContainText("看过 · 2026-08-20");
  await expect(back.getByRole("img", { name: "评分 5 / 5" })).toBeAttached();
  await expect(poster(page, "肖申克的救赎")).not.toContainText("弗兰克·德拉邦特");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("tabindex", "0");
  // 3 豆瓣新标签页，海报不翻回（豆瓣请求打桩，不出网）
  await context.route(/douban\.com/, (route) => route.fulfill({ body: "douban" }));
  const [popup] = await Promise.all([context.waitForEvent("page"), link.click()]);
  expect(popup.url()).toBe("https://movie.douban.com/subject/1292052/");
  await popup.close();
  await expect(shawshank).toHaveAttribute("aria-pressed", "true");
  // 4 翻另一张，前一张翻回；无评分无星级
  const nameless = card(page, "无名片");
  await nameless.click();
  await expect(nameless).toHaveAttribute("aria-pressed", "true");
  await expect(shawshank).toHaveAttribute("aria-pressed", "false");
  await expect(poster(page, "无名片").locator("[data-poster-back]").getByRole("img", { name: /评分/ })).toHaveCount(0);
  // 5 Esc
  await page.keyboard.press("Escape");
  await expect(nameless).toHaveAttribute("aria-pressed", "false");
  // 6 键盘聚焦，Enter 翻面
  // 上一次交互是键盘（Esc），程序聚焦同样命中 :focus-visible（WebKit 的 Tab 默认不经过 tabindex 元素，不用 Tab 走）
  await page.mouse.move(0, 0);
  await shawshank.focus();
  await expect(shawshank).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(shawshank).toHaveAttribute("aria-pressed", "true");
});

// [TC-US03-19] 减弱动效直接切换；暗色背面底色 #27272A
test("[TC-US03-19] 海报墙：减弱动效与暗色背面", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/media/movie");
  await waitForHydration(page);
  await card(page, "肖申克的救赎").click();
  const face = poster(page, "肖申克的救赎").locator("[data-poster-back]").locator("xpath=..");
  await expect(face).toHaveCSS("opacity", "1");
  await expect(face).toHaveCSS("background-color", "rgb(39, 39, 42)");
});

// [TC-US03-20][SC-SHELF-20] 按时间分段：默认关、开关、刷新保留、吸顶；手机按钮在标题行、2 列
test("[TC-US03-20] 海报墙按时间分段开关", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-15T10:00:00"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/media/movie");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForHydration(page);
  const toggle = page.getByRole("button", { name: "按时间" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["上个月", "本年"]);
  const headings = page.locator("[data-time-heading]");
  await expect(headings.nth(0)).toContainText("8 月 · 1 部");
  await expect(headings.nth(1)).toContainText("2026 · 1 部");
  await expect(page.locator('[data-poster-segment="last-month"]').getByRole("button", { name: "《肖申克的救赎》" })).toBeAttached();
  await expect(page.locator('[data-poster-segment="this-year"]').getByRole("button", { name: "《无名片》" })).toBeAttached();

  // 未吸顶时不挂 GradualBlur（否则会糊住本段第一排海报顶部）
  await expect(headings.nth(0)).not.toHaveAttribute("data-stuck", "");
  // 吸顶：滚到"本年"段海报中部时标题贴顶（夹具只有 2 部，视口调矮才滚得到）
  await page.setViewportSize({ width: 1440, height: 400 });
  await page.evaluate(() => {
    const segment = document.querySelector('[data-poster-segment="this-year"]')!;
    window.scrollTo(0, segment.getBoundingClientRect().top + window.scrollY + 40);
  });
  await expect.poll(() => headings.nth(1).evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(0);
  await expect(headings.nth(1)).toHaveAttribute("data-stuck", "");

  await page.reload();
  await waitForHydration(page);
  await expect(page.getByRole("button", { name: "按时间" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "按时间" }).click();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await waitForHydration(page);
  await expect(page.locator("main header").getByRole("button", { name: "按时间" })).toBeVisible();
  // 入场动画结束后两张并排（2 列）
  const boxes = () => page.locator("[data-poster-wall] [data-poster]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ x: Math.round(r.x), y: Math.round(r.y) })));
  await expect.poll(async () => new Set((await boxes()).map((b) => b.y)).size).toBe(1);
  const [a, b] = await boxes();
  expect(b.x).toBeGreaterThan(a.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

// 游戏海报（TC-US03-22、23）：砖块宽高比、平台徽标浮层的不透明度
const ratio = async (page: Page, title: string) => {
  const box = (await poster(page, title).boundingBox())!;
  return box.width / box.height;
};
const hoverLayer = (page: Page, title: string) => poster(page, title).locator("[data-poster-hover]");

// [TC-US03-22][SC-SHELF-21] 游戏海报：原比例不裁切、悬停显示平台与年份、翻面看详情
test("[TC-US03-22] 游戏海报：原比例、悬停平台、翻面", async ({ page }) => {
  await routeIgdb(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/media/game");
  await page.evaluate(() => localStorage.clear());
  await waitForHydration(page);
  await expect(page.locator("[data-poster-wall] [data-poster]")).toHaveCount(5);
  await expect.poll(() => columnsOfFirstRow(page)).toBe(5);

  // 1 砖块宽高比 = 封面原始比例（±1%），图片按原比例完整显示
  expect(Math.abs((await ratio(page, "黑神话：悟空")) / (810 / 1080) - 1)).toBeLessThan(0.01);
  expect(Math.abs((await ratio(page, "博德之门 3")) / (600 / 900) - 1)).toBeLessThan(0.01);
  const img = poster(page, "黑神话：悟空").locator("[data-poster-front] img");
  await expect(img).toHaveJSProperty("complete", true);
  expect(await img.evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight])).toEqual([810, 1080]);
  await expect(img).toHaveCSS("object-fit", "contain");

  // 2 悬停：左上角平台、右下角年份淡入，无名称浮层
  const wukong = card(page, "黑神话：悟空");
  await expect(wukong).toHaveAccessibleName("《黑神话：悟空》，PS5，2024");
  await expect(hoverLayer(page, "黑神话：悟空")).toHaveCSS("opacity", "0");
  await wukong.hover();
  await expect(hoverLayer(page, "黑神话：悟空")).toHaveCSS("opacity", "1");
  await expect(hoverLayer(page, "黑神话：悟空").locator("[data-platform-badge]")).toHaveText("PS5");
  await expect(hoverLayer(page, "黑神话：悟空").locator("[data-year-badge]")).toHaveText("2024");
  // 悬停时 FlipCard 倾斜、放大，不用 boundingBox 量偏移
  const corner = (selector: string, sides: string[]) => Promise.all(sides.map((side) => expect(hoverLayer(page, "黑神话：悟空").locator(selector)).toHaveCSS(side, "10px")));
  await corner("[data-hover-platform]", ["left", "top"]);
  await corner("[data-hover-year]", ["right", "bottom"]);
  await expect(poster(page, "黑神话：悟空").locator("[data-poster-caption]")).toHaveCount(0);

  // 3 换一张：Steam、2023
  await card(page, "博德之门 3").hover();
  await expect(hoverLayer(page, "博德之门 3")).toHaveCSS("opacity", "1");
  await expect(hoverLayer(page, "博德之门 3").locator("[data-platform-badge]")).toHaveText("Steam");
  await expect(hoverLayer(page, "博德之门 3").locator("[data-year-badge]")).toHaveText("2023");
  await expect(hoverLayer(page, "黑神话：悟空")).toHaveCSS("opacity", "0");

  // 4 翻面：背面有名称、评分、日期、豆瓣，无开发商、无平台
  await wukong.click();
  await expect(wukong).toHaveAttribute("aria-pressed", "true");
  const back = poster(page, "黑神话：悟空").locator("[data-poster-back]");
  await expect(back).toContainText("黑神话：悟空");
  await expect(back).toContainText("玩过 · 2025-08-20");
  await expect(back.getByRole("img", { name: "评分 4 / 5" })).toBeAttached();
  await expect(back.locator("[data-platform-badge]")).toHaveCount(0);
  await expect(poster(page, "黑神话：悟空").locator("a[data-douban-link]")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Game Science");

  // 6 按时间：在玩段
  await page.clock.setFixedTime(new Date("2026-10-27T10:00:00"));
  await page.getByRole("button", { name: "按时间" }).click();
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText("在玩");
  await expect(page.locator("[data-time-heading]").first()).toContainText("1 款");
  await expect(page.locator('[data-poster-segment="in-progress"]').getByRole("button", { name: /塞尔达传说：王国之泪/ })).toBeAttached();
});

// [TC-US03-22][SC-SHELF-21] 触屏（hover: none）：2 列，悬停不出平台
test("[TC-US03-22] 游戏海报：触屏不显示平台", async ({ browser, browserName }) => {
  test.skip(browserName === "webkit", "Playwright WebKit（Windows）不支持 isMobile 模拟");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await routeIgdb(page);
  await page.goto("/media/game");
  await waitForHydration(page);
  await expect.poll(() => columnsOfFirstRow(page)).toBe(2);
  await card(page, "黑神话：悟空").hover();
  await page.waitForTimeout(300);
  await expect(hoverLayer(page, "黑神话：悟空")).toHaveCSS("opacity", "0");
  await card(page, "黑神话：悟空").tap();
  await expect(card(page, "黑神话：悟空")).toHaveAttribute("aria-pressed", "true");
  await expect(poster(page, "黑神话：悟空").locator("[data-poster-back] [data-platform-badge]")).toHaveCount(0);
  await context.close();
});

// [TC-US03-23][SC-SHELF-22] 无封面 3:4、IGDB 404 保持原比例；都显示占位与游戏名，悬停仍有平台、可翻面
test("[TC-US03-23] 游戏无封面 / 加载失败占位", async ({ page }) => {
  await routeIgdb(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/media/game");
  await waitForHydration(page);
  await expect.poll(() => columnsOfFirstRow(page)).toBe(5);
  for (const [title, expected, platform] of [
    ["某款老游戏", 3 / 4, "PS4"],
    ["断链游戏", 810 / 1080, "Switch 2"],
  ] as const) {
    const placeholder = poster(page, title).getByRole("img", { name: "图片不可用" });
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText(title);
    expect(Math.abs((await ratio(page, title)) / expected - 1), title).toBeLessThan(0.01);
    await card(page, title).hover();
    await expect(hoverLayer(page, title)).toHaveCSS("opacity", "1");
    await expect(hoverLayer(page, title).locator("[data-platform-badge]")).toHaveText(platform);
    await card(page, title).click();
    await expect(card(page, title)).toHaveAttribute("aria-pressed", "true");
  }
});

// [TC-US03-24][SC-SHELF-23] 按时间：依据切换标记时间 / 发行年份，刷新保留，各分类共用，旧值 "1" 兼容
test("[TC-US03-24] 按时间：切换标记时间 / 发行年份", async ({ page }) => {
  await routeIgdb(page);
  await page.clock.setFixedTime(new Date("2026-10-27T10:00:00"));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/media/game");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForHydration(page);
  const headings = page.getByRole("heading", { level: 2 });
  const stored = () => page.evaluate(() => localStorage.getItem("media:by-time"));

  // 1 打开：依据切换出现，默认玩过时间（有"在玩"段）
  await page.getByRole("button", { name: "按时间" }).click();
  const basis = page.getByRole("radiogroup", { name: "分段依据" });
  await expect(basis.getByRole("radio")).toHaveText(["玩过时间", "发售年份"]);
  await expect(basis.getByRole("radio", { name: "玩过时间" })).toHaveAttribute("aria-checked", "true");
  await expect(headings.first()).toHaveText("在玩");

  // 2 发售年份：2024 / 2023 / 未知年份，无"在玩"段
  await basis.getByRole("radio", { name: "发售年份" }).click();
  await expect(headings).toHaveText(["2024", "2023", "未知年份"]);
  const meta = page.locator("[data-time-heading]");
  await expect(meta.nth(0)).toContainText("1 款");
  await expect(meta.nth(1)).toContainText("3 款");
  await expect(meta.nth(2)).toContainText("1 款");
  await expect(page.locator('[data-poster-segment="year-2023"] [data-poster]').first().getByRole("button", { name: /塞尔达传说：王国之泪/ })).toBeAttached();
  expect(await stored()).toBe("release");

  // 3 刷新保留
  await page.reload();
  await waitForHydration(page);
  await expect(headings).toHaveText(["2024", "2023", "未知年份"]);

  // 4 电影页同样按年份，文案随分类
  await page.goto("/media/movie");
  await waitForHydration(page);
  await expect(page.getByRole("radiogroup", { name: "分段依据" }).getByRole("radio")).toHaveText(["看过时间", "上映年份"]);
  await expect(page.getByRole("radio", { name: "上映年份" })).toHaveAttribute("aria-checked", "true");
  await expect(headings).toHaveText(["1994", "未知年份"]);

  // 5 关闭：不分段，依据切换消失
  await page.getByRole("button", { name: "按时间" }).click();
  await expect(headings).toHaveCount(0);
  await expect(page.getByRole("radiogroup", { name: "分段依据" })).toHaveCount(0);
  expect(await stored()).toBe("0");

  // 6 旧值 "1" → 标记时间
  await page.evaluate(() => localStorage.setItem("media:by-time", "1"));
  await page.reload();
  await waitForHydration(page);
  await expect(page.getByRole("radio", { name: "看过时间" })).toHaveAttribute("aria-checked", "true");
  await expect(headings.first()).toHaveText("本年");

  // 手机 390：按钮与依据切换在标题行，放不下时换行，无横向滚动
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await waitForHydration(page);
  await expect(page.locator("main header").getByRole("radiogroup", { name: "分段依据" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
