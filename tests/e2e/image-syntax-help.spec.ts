import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// US-12 图片写法说明（admin-post-editor"图片写法说明"）：桌面底栏 Popover；手机在设置面板最下方展开
async function openDraft(page: Page, baseURL: string) {
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `[E2E-US12] 图片写法 ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, body: "正文" });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
}

// [TC-US12-16][SC-LAYOUT-12] 键盘打开、5 个示例、无 iPhone 一节；Esc 关闭焦点回按钮；点外部关闭
test("[TC-US12-16] 底栏「图片写法」说明的打开、内容、Esc 关闭、焦点回归", async ({ page, baseURL }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openDraft(page, baseURL!);
  const entry = page.getByRole("button", { name: "图片写法" });
  const dialog = page.getByRole("dialog", { name: "图片写法" });

  await entry.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "图片写法" })).toBeFocused();
  for (const text of ["#wide", "#live", '"图注"', "连续几行只放图片", "#accordion"]) await expect(dialog).toContainText(text);
  await expect(dialog.getByRole("listitem")).toHaveCount(5);
  await expect(dialog).not.toContainText("iPhone");
  const box = (await dialog.boundingBox())!;
  const anchor = (await entry.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(anchor.y); // 在按钮上方

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(entry).toBeFocused();

  await entry.click();
  await expect(dialog).toBeVisible();
  await page.getByRole("textbox", { name: "正文" }).click();
  await expect(dialog).toBeHidden();
});

test.describe("手机", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // 手机：设置面板最下方"图片写法"，在面板内展开同样内容
  test("[TC-US12-16] 手机：设置面板最下方展开图片写法", async ({ page, baseURL }) => {
    await openDraft(page, baseURL!);
    await expect(page.getByRole("button", { name: "图片写法" })).toHaveCount(0); // 底栏在手机上隐藏
    await page.getByRole("button", { name: "设置" }).click();
    const settings = page.getByRole("complementary", { name: "文章设置" });
    const toggle = settings.getByRole("button", { name: /图片写法/ });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const region = settings.getByRole("region", { name: "图片写法" });
    await expect(region.getByRole("listitem")).toHaveCount(5);
    await expect(region).toContainText("拖入安卓动态照片会自动生成");
    expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
