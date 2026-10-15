import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// US-12 预览图片菜单（admin-post-editor"图片菜单"）：单图"图片选项"→ 宽图，改写源码、可撤销；定位保护；键盘操作
const IMG = "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg";
const IMG2 = "/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg";

const preview = (page: Page) => page.getByTestId("md-preview");
const editor = (page: Page) => page.getByRole("textbox", { name: "正文" });
const images = (page: Page) => preview(page).locator("figure[data-article-image]:has([data-status])");
const menu = (page: Page) => page.getByRole("menu", { name: "图片" });
const wideItem = (page: Page) => menu(page).getByRole("menuitemcheckbox", { name: "宽图" });
// 按钮自身不透明，显隐由外层容器的 opacity 控制：任一祖先为 0 即不可见
const shown = (locator: Locator) =>
  locator.evaluate((element) => {
    for (let node: Element | null = element; node && node !== document.body; node = node.parentElement) if (getComputedStyle(node).opacity === "0") return false;
    return true;
  });

async function openDraft(page: Page, baseURL: string, body: string, title: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `[E2E-US12] ${title} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, body });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  await expect(preview(page).locator("figure[data-article-image]:has([data-status]), figure[data-image-gallery]").first()).toBeVisible({ timeout: 15_000 });
}

async function openMenu(page: Page, index = 0) {
  await images(page).nth(index).hover();
  const trigger = images(page).nth(index).getByRole("button", { name: "图片选项" });
  await expect.poll(() => shown(trigger)).toBe(true);
  await trigger.click();
  await expect(menu(page)).toBeVisible();
}

// [TC-US12-09][SC-LAYOUT-07] 悬停出现按钮 → 菜单"宽图"改写第 5 行、预览变宽图、菜单保持打开并勾选；触发自动保存；⌘Z 撤销
test("[TC-US12-09] 单图菜单切换宽图，改写源码，撤销", async ({ page, baseURL }) => {
  const body = `第一段\n\n第二段\n\n![山](${IMG})`;
  await openDraft(page, baseURL!, body, "宽图");
  expect(await shown(images(page).getByRole("button", { name: "图片选项" }))).toBe(false);

  await openMenu(page);
  await expect(wideItem(page)).toHaveAttribute("aria-checked", "false");
  const saved = page.waitForRequest((request) => request.method() !== "GET" && /\/api\/admin\/posts\/\d+$/.test(new URL(request.url()).pathname));
  await wideItem(page).click();

  await expect(editor(page)).toHaveValue(`第一段\n\n第二段\n\n![山](${IMG}#wide)`);
  await expect(preview(page).locator("figure[data-article-image][data-wide]")).toHaveCount(1);
  await expect(wideItem(page)).toHaveAttribute("aria-checked", "true");
  expect((await saved).postData()).toContain("#wide"); // 改写走自动保存

  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(editor(page)).toHaveValue(body);
});

// [TC-US12-10][SC-LAYOUT-07] 标记合并：无 → #wide；#live → #live,wide；#live,wide → #live；#wide → 去掉 #；组图首张 #accordion 没有单图菜单
test("[TC-US12-10] 已有 #live 时开 / 关宽图，标记合并正确", async ({ page, baseURL }) => {
  const fragments = ["", "#live", "#live,wide", "#wide"];
  const body = fragments.map((fragment, i) => `![图${i}](${i % 2 ? IMG2 : IMG}${fragment})`).join("\n\n") + `\n\n![组1](${IMG}#accordion)\n![组2](${IMG2})\n![组3](${IMG})`;
  await openDraft(page, baseURL!, body, "合并");
  await expect(images(page)).toHaveCount(4);

  for (let i = 0; i < fragments.length; i++) {
    await openMenu(page, i);
    await wideItem(page).click();
    await page.keyboard.press("Escape");
    await expect(menu(page)).toBeHidden();
  }
  const expected = ["#wide", "#live,wide", "#live", ""];
  await expect(editor(page)).toHaveValue(
    expected.map((fragment, i) => `![图${i}](${i % 2 ? IMG2 : IMG}${fragment})`).join("\n\n") + `\n\n![组1](${IMG}#accordion)\n![组2](${IMG2})\n![组3](${IMG})`,
  );
  await expect(preview(page).locator("[data-image-gallery]").getByRole("button", { name: "图片选项" })).toHaveCount(0);
});

// [TC-US12-14][SC-LAYOUT-11] 菜单打开期间源码中的图片被删：菜单关闭，源码不被改写
test("[TC-US12-14] 菜单打开期间删除该图，菜单关闭、源码不改写", async ({ page, baseURL }) => {
  await openDraft(page, baseURL!, `![山](${IMG})`, "删除");
  await openMenu(page);
  // 用原生 setter 写入（直接赋 value 会被 React 的值追踪吞掉），焦点留在菜单里
  await editor(page).evaluate((textarea: HTMLTextAreaElement) => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, "新内容");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(preview(page).getByText("新内容")).toBeVisible();
  await expect(menu(page)).toBeHidden();
  await expect(editor(page)).toHaveValue("新内容");
});

// [TC-US12-15][SC-LAYOUT-11] 同一 URL 出现两次，只改被操作的那一张
test("[TC-US12-15] 同一 URL 出现两次，菜单只改被操作的那一张", async ({ page, baseURL }) => {
  await openDraft(page, baseURL!, `![a](${IMG})\n\n![b](${IMG})`, "重复");
  await expect(images(page)).toHaveCount(2);
  await openMenu(page, 1);
  await wideItem(page).click();
  await expect(editor(page)).toHaveValue(`![a](${IMG})\n\n![b](${IMG}#wide)`);
});

// [TC-US12-18][SC-LAYOUT-07] Tab 到"图片选项"（聚焦后可见）、Enter 打开焦点在第一项、↓ 循环、Space 切换、Esc 关闭焦点回到按钮
test("[TC-US12-18] 菜单可用键盘操作", async ({ page, baseURL }) => {
  await openDraft(page, baseURL!, `![山](${IMG})`, "键盘");
  const trigger = images(page).getByRole("button", { name: "图片选项" });
  await preview(page).getByRole("heading", { level: 1 }).click();
  for (let i = 0; i < 10 && !(await trigger.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(trigger).toBeFocused();
  await expect.poll(() => shown(trigger)).toBe(true); // 渐显 0.2s

  await page.keyboard.press("Enter");
  await expect(wideItem(page)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(wideItem(page)).toBeFocused();
  await page.keyboard.press("Space");
  await expect(editor(page)).toHaveValue(`![山](${IMG}#wide)`);
  await expect(wideItem(page)).toHaveAttribute("aria-checked", "true");
  await expect(wideItem(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu(page)).toBeHidden();
  await expect(images(page).getByRole("button", { name: "图片选项" })).toBeFocused();
});

const IMGS = ["aaaaaaaaaa_1600x900_556677", "bbbbbbbbbb_1200x800_112233", "cccccccccc_800x1200_445566", "dddddddddd_1000x1000_778899", "eeeeeeeeee_1400x1050_8a7b6c", "ffffffffff_900x1600_3d6a2c", "gggggggggg_1920x1080_a8382c", "hhhhhhhhhh_1080x1350_e8a15a"].map(
  (name) => `/img/2026/10/${name}.jpg`,
);
const group = (n: number) => IMGS.slice(0, n).map((src, i) => `![${i + 1}](${src})`).join("\n");
const galleryMenu = (page: Page) => page.getByRole("menu", { name: "组图" });

async function openGalleryMenu(page: Page, index = 0) {
  const gallery = preview(page).locator("figure[data-image-gallery]").nth(index);
  await gallery.hover();
  const trigger = gallery.getByRole("button", { name: "组图选项" });
  await expect.poll(() => shown(trigger)).toBe(true);
  await trigger.click();
  await expect(galleryMenu(page)).toBeVisible();
}

// [TC-US12-11][SC-LAYOUT-08] 网格 → 手风琴 → 网格 → 拆成单图（菜单关闭、焦点回到预览区）→ 撤销
test("[TC-US12-11] 组图菜单：网格 ↔ 手风琴 ↔ 拆成单图", async ({ page, baseURL }) => {
  const body = group(4);
  await openDraft(page, baseURL!, body, "组图菜单");
  await openGalleryMenu(page);

  await galleryMenu(page).getByRole("menuitemradio", { name: "手风琴" }).click();
  await expect(editor(page)).toHaveValue(body.replace(IMGS[0], `${IMGS[0]}#accordion`));
  await expect(preview(page).locator("[data-image-gallery=accordion]")).toHaveCount(1);
  await expect(galleryMenu(page).getByRole("menuitemradio", { name: "手风琴" })).toHaveAttribute("aria-checked", "true");
  await expect(galleryMenu(page).getByRole("menuitemradio", { name: "手风琴" })).toBeFocused();

  await galleryMenu(page).getByRole("menuitemradio", { name: "网格" }).click();
  await expect(editor(page)).toHaveValue(body);
  await expect(preview(page).locator("[data-image-gallery=grid]")).toHaveCount(1);

  await galleryMenu(page).getByRole("menuitem", { name: "拆成单图" }).click();
  await expect(editor(page)).toHaveValue(body.split("\n").join("\n\n"));
  await expect(preview(page).locator("[data-image-gallery]")).toHaveCount(0);
  await expect(images(page)).toHaveCount(4);
  await expect(galleryMenu(page)).toBeHidden();
  await expect(preview(page).locator(".prose")).toBeFocused();

  await editor(page).focus();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(editor(page)).toHaveValue(body);
  await expect(preview(page).locator("[data-image-gallery=grid]")).toHaveCount(1);
});

// [TC-US12-12][SC-LAYOUT-08] 2 / 8 张时"手风琴"不可用：aria-disabled、提示原因、点击不改写；3 张可用
test("[TC-US12-12] 张数不在 3–7 时手风琴不可用并提示", async ({ page, baseURL }) => {
  const body = [group(2), group(8), group(3)].join("\n\n");
  await openDraft(page, baseURL!, body, "手风琴不可用");
  for (const [index, disabled] of [
    [0, true],
    [1, true],
    [2, false],
  ] as const) {
    await openGalleryMenu(page, index);
    const accordion = galleryMenu(page).getByRole("menuitemradio", { name: "手风琴" });
    if (disabled) {
      await expect(accordion).toHaveAttribute("aria-disabled", "true");
      await accordion.hover();
      await expect(page.getByRole("tooltip")).toHaveText("手风琴需要 3–7 张图片");
      await accordion.click({ force: true }); // aria-disabled 在 Playwright 看来不可点，强制点击验证点了也不改写
      await expect(editor(page)).toHaveValue(body);
    } else {
      await expect(accordion).not.toHaveAttribute("aria-disabled");
    }
    await page.keyboard.press("Escape");
    await expect(galleryMenu(page)).toBeHidden();
  }
});

test.describe("手机", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  // [TC-US12-13][SC-LAYOUT-09] 点按图片 / 组图直接出菜单，菜单项 ≥ 44px，点外部关闭；切换宽图后源码已改写
  test("[TC-US12-13] 手机点按出现菜单，点外部关闭", async ({ page, baseURL }) => {
    await login(page);
    const body = `开头段落\n\n![山](${IMG})\n\n${group(3)}`;
    const id = await adminApi(page, baseURL!).create({ title: `[E2E-US12] 手机菜单 ${Date.now().toString(36)}`, body });
    await page.goto(`/admin/posts/${id}`);
    await waitForHydration(page);
    await page.getByRole("tab", { name: "预览" }).click();
    await expect(images(page).first()).toBeVisible({ timeout: 15_000 });

    await images(page).first().tap();
    await expect(menu(page)).toBeVisible();
    const box = (await wideItem(page).boundingBox())!;
    expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    const trigger = (await images(page).first().getByRole("button", { name: "图片选项" }).boundingBox())!;
    expect(Math.min(trigger.width, trigger.height)).toBeGreaterThanOrEqual(44);
    await preview(page).getByText("开头段落").tap();
    await expect(menu(page)).toBeHidden();

    await preview(page).locator("figure[data-image-gallery]").tap();
    await expect(galleryMenu(page)).toBeVisible();
    await preview(page).getByText("开头段落").tap();
    await expect(galleryMenu(page)).toBeHidden();

    await images(page).first().tap();
    await wideItem(page).tap();
    await page.getByRole("tab", { name: "编辑" }).click();
    await expect(editor(page)).toHaveValue(`开头段落\n\n![山](${IMG}#wide)\n\n${group(3)}`);
  });
});
