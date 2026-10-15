import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// US-11 预览中的实况照片（LiveBadge、悬停 / 长按播放、播放失败降级）。夹具：R2 中的 jpg + 同名 .live.mp4（H.264，npm run e2e:seed）
// 损坏视频用独立夹具而非 page.route：WebKit 的媒体请求不经过 page.route。长按用例用 CDP 触摸事件，只在 chromium 上跑
const LIVE = "/img/2026/10/jjjjjjjjjj_960x1280_6b7f8e.jpg";
const BROKEN = "/img/2026/10/kkkkkkkkkk_960x1280_6b7f8e.jpg"; // 同名 .live.mp4 是损坏字节
const IMG = (n: number) => ["/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg", "/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg"][n - 1];

const preview = (page: Page) => page.getByTestId("md-preview");
const single = (page: Page) => preview(page).locator("figure[data-article-image][data-live]");
const cell = (page: Page) => preview(page).locator("[data-image-gallery=grid] [data-chroma-area]:has(> [data-live-photo])");
const isPlaying = (scope: Locator) => scope.locator("video").evaluate((v: HTMLVideoElement) => !v.paused && v.muted && !v.loop);
// WebKit 把 currentTime = 0 对齐到最近的帧（约 0.003s），按一帧容差判断归零
const isReset = (scope: Locator) => scope.locator("video").evaluate((v: HTMLVideoElement) => v.paused && v.currentTime < 1 / 30);

async function openDraft(page: Page, baseURL: string, body: string, title: string) {
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `[E2E-US11] ${title} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, body });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
}

// [TC-US11-23][SC-LIVE-10] 桌面悬停播放（静音、不循环）、标记变播放中，移出暂停并回到第 0 秒；单图与组图单元格
test("[TC-US11-23] 预览中桌面悬停播放、移出复原", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDraft(page, baseURL!, `![实况](${LIVE}#live "实况")\n\n![山](${IMG(1)})\n![实况组图](${LIVE}#live)\n![猫](${IMG(2)})`, "悬停");

  for (const scope of [single(page), cell(page)]) {
    await expect(scope.locator("[data-live-badge]")).toBeVisible({ timeout: 15_000 });
    await expect(scope.locator("[data-live-badge]")).not.toHaveAttribute("data-playing");
    await scope.hover();
    await expect.poll(() => isPlaying(scope), { intervals: [100] }).toBe(true);
    await expect(scope.locator("[data-live-badge]")).toHaveAttribute("data-playing", "");
    await page.mouse.move(0, 0);
    await expect.poll(() => isReset(scope), { intervals: [100] }).toBe(true);
    await expect(scope.locator("[data-live-badge]")).not.toHaveAttribute("data-playing");
  }
});

test.describe("触屏", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  // [TC-US11-24][SC-LIVE-10] 长按播放、松手复原；系统长按菜单被阻止；长按不打开图片菜单
  test("[TC-US11-24] 手机长按播放、松手复原，不弹系统菜单", async ({ page, baseURL, browserName }) => {
    test.skip(browserName !== "chromium", "CDP 触摸事件只有 chromium 支持");
    await openDraft(page, baseURL!, `![实况](${LIVE}#live)`, "长按");
    await page.getByRole("tab", { name: "预览" }).click();
    const figure = single(page);
    await expect(figure.locator("[data-live-badge]")).toBeVisible({ timeout: 15_000 });
    const box = (await figure.locator("[data-live-photo]").boundingBox())!;
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] });
    await expect.poll(() => isPlaying(figure), { intervals: [100] }).toBe(true);
    await expect(figure.locator("[data-live-badge]")).toHaveAttribute("data-playing", "");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => isReset(figure), { intervals: [100] }).toBe(true);

    const contextMenuBlocked = await figure.locator("[data-live-photo]").evaluate((layer) => {
      const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      layer.dispatchEvent(event);
      return event.defaultPrevented && getComputedStyle(layer).userSelect === "none";
    });
    expect(contextMenuBlocked).toBe(true);
    await expect(page.getByRole("menu")).toHaveCount(0);
  });
});

// [TC-US11-25][SC-LIVE-11] 视频无法解码（损坏字节夹具）：悬停后隐藏 LIVE、不显示视频，静态图正常
test("[TC-US11-25] 视频无法解码时只显示静态图，隐藏 LIVE", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDraft(page, baseURL!, `![实况](${BROKEN}#live)`, "降级");
  const figure = single(page);
  await expect(figure.locator("[data-live-badge]")).toBeVisible({ timeout: 15_000 });

  await figure.hover();
  await expect(figure.locator("[data-live-badge]")).toHaveCount(0);
  await expect(figure.locator("video")).toHaveCount(0);
  await expect(figure.getByRole("img", { name: "实况" })).toBeVisible();
});
