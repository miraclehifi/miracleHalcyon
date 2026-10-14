import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 计时用 page.clock 控制（悬停延迟 400ms、预热窗口 300ms、长按 500ms），时钟暂停，不依赖真实时间
async function openPost(page: Page, baseURL: string, label: string, body = "思考") {
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `${label}${Date.now().toString(36)}`, body });
  await page.clock.install();
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  // 暂停页面时钟：之后只有 runFor 推进时间（install 后时间仍按真实时间流逝，并行负载下断言会晚于 400ms）
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
}

const tooltip = (page: Page) => page.getByRole("tooltip");
const hover = async (page: Page, target: Locator) => {
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
};
const away = (page: Page) => page.mouse.move(5, 790);
const pretendPlatform = (page: Page, platform: string) =>
  page.addInitScript((value) => {
    Object.defineProperty(Navigator.prototype, "platform", { get: () => value });
    Object.defineProperty(Navigator.prototype, "userAgentData", { get: () => ({ platform: value }) });
  }, platform);

test.describe("桌面", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  // [TC-US10-06][SC-TOOLBAR-07] 冷启动 400ms；键帽按平台；提示在按钮下方；无快捷键的按钮不显示 kbd
  for (const [platform, keycap] of [
    ["MacIntel", "⌘B"],
    ["Win32", "Ctrl B"],
  ] as const) {
    test(`[TC-US10-06] 悬停 400ms 显示提示与键帽（${platform}）`, async ({ page, baseURL }) => {
      await pretendPlatform(page, platform);
      await openPost(page, baseURL!, "T");
      const bold = page.getByRole("button", { name: "加粗" });
      await hover(page, bold);
      await page.clock.runFor(350);
      await expect(tooltip(page)).toHaveCount(0);
      await page.clock.runFor(250);
      await expect(tooltip(page)).toContainText("加粗");
      await expect(tooltip(page).locator("kbd").first()).toHaveText(keycap);
      const [tip, button] = [(await tooltip(page).boundingBox())!, (await bold.boundingBox())!];
      expect(tip.y).toBeGreaterThanOrEqual(button.y + button.height);

      await away(page);
      await page.clock.runFor(700);
      await hover(page, page.getByRole("button", { name: "任务列表" }));
      await page.clock.runFor(600);
      await expect(tooltip(page)).toHaveText("任务列表");
      await expect(tooltip(page).locator("kbd")).toHaveCount(0);
    });
  }

  // [TC-US10-07][SC-TOOLBAR-08] 提示开着或预热窗口内换按钮：立即换内容，始终只有一个提示
  test("[TC-US10-07] 相邻按钮共用一个提示", async ({ page, baseURL }) => {
    await openPost(page, baseURL!, "G");
    await hover(page, page.getByRole("button", { name: "加粗" }));
    await page.clock.runFor(450);
    await expect(tooltip(page)).toContainText("加粗");
    await hover(page, page.getByRole("button", { name: "斜体" }));
    await page.clock.runFor(100);
    await expect(tooltip(page)).toHaveCount(1);
    await expect(tooltip(page)).toContainText("斜体");

    await away(page);
    await page.clock.runFor(200);
    await hover(page, page.getByRole("button", { name: "链接" }));
    await page.clock.runFor(100);
    await expect(tooltip(page)).toHaveCount(1);
    await expect(tooltip(page)).toContainText("链接");
  });

  // [TC-US10-08][SC-TOOLBAR-09] 键盘聚焦立即显示并关联 aria-describedby；Esc 关闭且焦点不变；鼠标点击不显示
  test("[TC-US10-08] 键盘聚焦显示、Esc 关闭", async ({ page, baseURL }) => {
    await openPost(page, baseURL!, "F");
    await page.getByRole("textbox", { name: "标题" }).focus();
    await page.keyboard.press("Tab");
    const heading = page.getByRole("button", { name: "二级标题" });
    await expect(heading).toBeFocused();
    await expect(tooltip(page)).toHaveText("二级标题");
    expect(await heading.getAttribute("aria-describedby")).toBe(await tooltip(page).getAttribute("id"));

    await page.keyboard.press("Escape");
    await expect(tooltip(page)).toHaveCount(0);
    await expect(heading).toBeFocused();
    await expect(heading).not.toHaveAttribute("aria-describedby");

    await page.getByRole("button", { name: "加粗" }).click();
    await away(page);
    await page.clock.runFor(600);
    await expect(tooltip(page)).toHaveCount(0);
  });

  // [TC-US10-10][SC-TOOLBAR-11] 抽屉"关闭设置"有提示（下方）；带文字的"设置"没有
  test("[TC-US10-10] 顶栏与抽屉图标按钮的提示（桌面）", async ({ page, baseURL }) => {
    await openPost(page, baseURL!, "D");
    await page.getByRole("banner").getByRole("button", { name: "设置" }).click();
    const close = page.getByRole("button", { name: "关闭设置" });
    await hover(page, close);
    await page.clock.runFor(600);
    await expect(tooltip(page)).toHaveText("关闭设置");
    expect((await tooltip(page).boundingBox())!.y).toBeGreaterThanOrEqual((await close.boundingBox())!.y + (await close.boundingBox())!.height);

    await away(page);
    await page.clock.runFor(700);
    await hover(page, page.getByRole("banner").getByRole("button", { name: "设置" }));
    await page.clock.runFor(600);
    await expect(tooltip(page)).toHaveCount(0);
  });
});

test.describe("手机", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  // 触屏长按：派发 touch 类型的指针事件，按住 ms 毫秒后松开并补一次 click（与真实触屏一致）
  async function longPress(page: Page, target: Locator, ms: number) {
    const box = (await target.boundingBox())!;
    const point = { clientX: box.x + box.width / 2, clientY: box.y + box.height / 2, pointerId: 7, pointerType: "touch", bubbles: true, isPrimary: true };
    await target.dispatchEvent("pointerdown", point);
    await page.clock.runFor(ms);
    await target.dispatchEvent("pointerup", point);
    await target.dispatchEvent("click", point);
    await page.clock.runFor(200); // 提示在计时器回调后才渲染，再推进让定位与弹出动画的帧跑完
  }

  // [TC-US10-09][SC-TOOLBAR-10] 长按 500ms 显示提示（上方、无键帽），随后的点击被吞掉；轻点正常执行
  test("[TC-US10-09] 手机长按显示提示且不触发操作", async ({ page, baseURL }) => {
    await openPost(page, baseURL!, "M");
    const body = page.getByRole("textbox", { name: "正文" });
    await body.evaluate((el: HTMLTextAreaElement) => {
      el.focus();
      el.select();
    });
    const bold = page.getByRole("button", { name: "加粗" });
    await longPress(page, bold, 600);
    await expect(tooltip(page)).toHaveText("加粗");
    await expect(tooltip(page).locator("kbd")).toHaveCount(0);
    const [tip, button] = [(await tooltip(page).boundingBox())!, (await bold.boundingBox())!];
    expect(tip.y + tip.height).toBeLessThanOrEqual(button.y);
    await expect(body).toHaveValue("思考");

    await body.evaluate((el: HTMLTextAreaElement) => {
      el.focus();
      el.select();
    });
    await bold.tap();
    await expect(body).toHaveValue("**思考**");
  });

  // [TC-US10-10][SC-TOOLBAR-11] 手机顶栏返回按钮长按：提示"返回文章列表"在按钮下方且完整在视口内
  test("[TC-US10-10] 顶栏与抽屉图标按钮的提示（手机）", async ({ page, baseURL }) => {
    await openPost(page, baseURL!, "B");
    const back = page.getByRole("button", { name: "返回文章列表" });
    await longPress(page, back, 600);
    await expect(tooltip(page)).toHaveText("返回文章列表");
    const [tip, button] = [(await tooltip(page).boundingBox())!, (await back.boundingBox())!];
    expect({ below: tip.y >= button.y + button.height, inside: tip.x >= 0 && tip.x + tip.width <= 390 }).toEqual({ below: true, inside: true });
  });
});
