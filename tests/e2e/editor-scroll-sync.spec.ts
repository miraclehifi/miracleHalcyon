import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// 同步滚动（editor module-spec §3）：并排视图下编辑区滚动，预览滚到对应位置；反向同样，且不移动光标
// 16 个二级标题，各节长度不等；每行很短（不折行），编辑区某行的位置 = 上内边距 + 行号 × 行高
const SECTION_LENGTHS = [3, 12, 5, 20, 2, 8, 15, 4, 10, 6, 18, 3, 9, 7, 14, 5];
const BODY = SECTION_LENGTHS.map((length, i) => [`## 第 ${i + 1} 节`, "", ...Array.from({ length }, (_, j) => `第 ${i + 1} 节第 ${j + 1} 段。\n`)].join("\n")).join("\n");

const preview = (page: Page) => page.getByRole("region", { name: "预览" });
const editor = (page: Page) => page.getByRole("textbox", { name: "正文" });

// 把源码中第 n 个（1 起）"## " 行滚到编辑区顶部
async function scrollEditorToHeading(page: Page, n: number) {
  await editor(page).evaluate((textarea: HTMLTextAreaElement, nth) => {
    const lines = textarea.value.split("\n");
    const index = lines.map((line, i) => (line.startsWith("## ") ? i : -1)).filter((i) => i >= 0)[nth - 1];
    const style = getComputedStyle(textarea);
    textarea.scrollTop = parseFloat(style.paddingTop) + index * parseFloat(style.lineHeight);
  }, n);
}

// 预览中第 n 个 h2 距预览视口顶部的距离 / 视口高度
async function headingOffset(page: Page, n: number) {
  const [box, heading] = await Promise.all([preview(page).boundingBox(), preview(page).locator("h2").nth(n - 1).boundingBox()]);
  return Math.abs(heading!.y - box!.y) / box!.height;
}

// [TC-US04-14][SC-PREVIEW-08] 编辑区滚到第 3、第 10 个二级标题，预览对应标题在视口顶部 25% 以内；滚回顶部预览也回顶部
test("[TC-US04-14] 编辑区滚动时预览同步滚动", async ({ page, baseURL }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}${testInfo.project.name[0]}`;
  await login(page);
  const id = await adminApi(page, baseURL!).create({ title: `滚动 ${run}`, slug: `scroll-${run}`, body: BODY });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  await expect(preview(page).locator("h2")).toHaveCount(16, { timeout: 15_000 }); // 首次渲染：WebKit 冷编译语法规则，并行负载下可超过 5 秒

  for (const n of [3, 10]) {
    await scrollEditorToHeading(page, n);
    await expect.poll(() => headingOffset(page, n)).toBeLessThanOrEqual(0.25);
  }
  await editor(page).evaluate((textarea: HTMLTextAreaElement) => (textarea.scrollTop = 0));
  await expect.poll(() => preview(page).evaluate((section) => section.scrollTop)).toBeLessThanOrEqual(10);

  // 反向：滚动预览，编辑区跟随，光标不动
  await editor(page).evaluate((textarea: HTMLTextAreaElement) => textarea.setSelectionRange(5, 5));
  await preview(page).evaluate((section) => {
    const heading = section.querySelectorAll("h2")[7] as HTMLElement;
    section.scrollTop = heading.getBoundingClientRect().top - section.getBoundingClientRect().top + section.scrollTop;
  });
  await expect.poll(() => editor(page).evaluate((textarea: HTMLTextAreaElement) => textarea.scrollTop)).toBeGreaterThan(100);
  expect(await editor(page).evaluate((textarea: HTMLTextAreaElement) => textarea.selectionStart)).toBe(5);

  // 只有并排视图同步：切到"编辑"再回"并排"后仍生效，"编辑"视图下滚动不报错
  const view = page.getByRole("radiogroup", { name: "视图" });
  await view.getByRole("radio", { name: "编辑" }).click();
  await scrollEditorToHeading(page, 12);
  await view.getByRole("radio", { name: "并排" }).click();
  await scrollEditorToHeading(page, 6);
  await expect.poll(() => headingOffset(page, 6)).toBeLessThanOrEqual(0.25);
});
