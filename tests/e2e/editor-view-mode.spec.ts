import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 写文章页视图切换（admin-post-editor.md"顶栏""响应式"）：≥ 768px 分段控件 编辑 / 并排 / 预览（记在 localStorage），< 768px 两个 Tab
async function openPost(page: Page, baseURL: string, project: string, body: string) {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${project[0]}`;
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `视图 ${run}`, slug: `view-${run}`, body });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
}

const editorPane = (page: Page) => page.getByRole("region", { name: "编辑" });
const previewPane = (page: Page) => page.getByRole("region", { name: "预览" });
const noHorizontalScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

// [TC-US04-12][SC-PREVIEW-06] 1280 默认并排、768 默认编辑（admin-post-editor"响应式"）；切换不丢内容，刷新后保持
for (const [width, defaultMode] of [
  [1280, "并排"],
  [768, "编辑"],
] as const) {
  test(`[TC-US04-12] 宽屏视图切换 ${width}px`, async ({ page, baseURL }, testInfo) => {
    await page.setViewportSize({ width, height: 800 });
    await openPost(page, baseURL!, testInfo.project.name, "# 保持不变");
    const view = page.getByRole("radiogroup", { name: "视图" });
    await expect(view.getByRole("radio", { checked: true })).toHaveText(defaultMode);
    await expect(page.getByRole("tablist")).toHaveCount(0);

    await view.getByRole("radio", { name: "并排" }).click();
    const editor = (await editorPane(page).boundingBox())!;
    const preview = (await previewPane(page).boundingBox())!;
    expect(preview.x).toBeGreaterThanOrEqual(editor.x + editor.width - 1);
    expect(preview.y).toBe(editor.y);

    await view.getByRole("radio", { name: "编辑" }).click();
    await expect(previewPane(page)).toBeHidden();
    expect((await editorPane(page).boundingBox())!.width).toBeGreaterThanOrEqual(width - 2);

    await view.getByRole("radio", { name: "预览" }).click();
    await expect(editorPane(page)).toBeHidden();
    await expect(previewPane(page).getByRole("heading", { level: 1, name: "保持不变" })).toBeVisible();

    await view.getByRole("radio", { name: "并排" }).click();
    await expect(page.getByRole("textbox", { name: "正文" })).toHaveValue("# 保持不变");
    await page.reload();
    await waitForHydration(page);
    await expect(page.getByRole("radiogroup", { name: "视图" }).getByRole("radio", { checked: true })).toHaveText("并排");
    await expect(previewPane(page)).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });
}

// [TC-US04-13][SC-PREVIEW-07] < 768px：编辑 / 预览两个 Tab，默认编辑；无横向滚动；工具栏在页面底部
for (const [width, height] of [
  [767, 800],
  [375, 667],
] as const) {
  test(`[TC-US04-13] 窄屏 Tab 切换 ${width}px`, async ({ page, baseURL }, testInfo) => {
    await page.setViewportSize({ width, height });
    await openPost(page, baseURL!, testInfo.project.name, "# 窄屏预览");
    const tab = (name: string) => page.getByRole("tab", { name });
    await expect(tab("编辑")).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("radiogroup", { name: "视图" })).toBeHidden();
    await expect(editorPane(page)).toBeVisible();
    await expect(previewPane(page)).toBeHidden();
    expect(await noHorizontalScroll(page)).toBe(true);
    const toolbar = (await page.getByRole("toolbar", { name: "格式" }).boundingBox())!;
    expect(toolbar.y + toolbar.height).toBeGreaterThanOrEqual(height - 1);

    await tab("预览").click();
    await expect(previewPane(page).getByRole("heading", { level: 1, name: "窄屏预览" })).toBeVisible();
    await expect(editorPane(page)).toBeHidden();

    await tab("编辑").click();
    await expect(page.getByRole("textbox", { name: "正文" })).toHaveValue("# 窄屏预览");
  });
}
