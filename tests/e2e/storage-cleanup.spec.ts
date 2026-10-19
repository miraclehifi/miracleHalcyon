import { expect, test, type Page, type Route } from "@playwright/test";
import { login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// F-006 US-02 一键清理（admin-storage.md"交互"）。本地 D1 / R2 被并行用例共享且跨运行保留：真实清理会删掉其他用例的夹具，
// 两个存储接口一律用 page.route 返回固定数据；清理判定与"清理时重新判定"（TC-US02-04）由 tests/integration/media 覆盖
const ORPHANS = "**/api/admin/storage/orphans";
const CLEANUP = "**/api/admin/storage/cleanup";
const SUMMARY = { orphanImageCount: 2, orphanImageBytes: 3_000_000, orphanVideoCount: 1, orphanVideoBytes: 2_000_000, totalOrphanBytes: 6_000_000, protectedCount: 0 };
const EMPTY = { orphanImageCount: 0, orphanImageBytes: 0, orphanVideoCount: 0, orphanVideoBytes: 0, totalOrphanBytes: 0, protectedCount: 3 };
const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });

// 检测接口：先返回 first，清理之后返回 after
async function mockDetect(page: Page, first = SUMMARY, after = EMPTY) {
  let cleaned = false;
  const detections: number[] = [];
  await page.route(ORPHANS, (route) => {
    detections.push(Date.now());
    return route.fulfill(json({ summary: cleaned ? after : first, checkedAt: new Date().toISOString() }));
  });
  return { markCleaned: () => (cleaned = true), detections };
}

async function openStorage(page: Page) {
  await login(page);
  await page.goto("/admin/storage");
  await waitForHydration(page);
  await expect(page.locator("dl").filter({ hasText: "未引用图片" })).toContainText(/\d+ 张/);
}

const cleanButton = (page: Page) => page.getByRole("button", { name: "一键清理未引用资源" });
const dialog = (page: Page) => page.getByRole("alertdialog");

test("[TC-US02-10][SC-CLEANUP-01] 确认清理：结果提示按接口返回，统计归零，按钮禁用", async ({ page }) => {
  const detect = await mockDetect(page);
  await page.route(CLEANUP, (route) => {
    detect.markCleaned();
    return route.fulfill(json({ removedImages: 2, removedVideos: 1, freedBytes: 15_000 }));
  });
  await openStorage(page);

  await cleanButton(page).click();
  await dialog(page).getByRole("button", { name: "清理" }).click();
  await expect(page.getByText("已清理 3 项，释放 15 KB")).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
  await expect(page.getByText("存储状态良好，无未引用文件")).toBeVisible();
  await expect(cleanButton(page)).toBeDisabled();
});

test("[TC-US02-11][SC-CLEANUP-03] 确认框文案；初始焦点在取消、Tab 在框内循环；取消 / Esc 关闭、焦点回到按钮、不发请求", async ({ page }) => {
  await mockDetect(page);
  const cleanups: string[] = [];
  await page.route(CLEANUP, (route: Route) => {
    cleanups.push(route.request().url());
    return route.fulfill(json({ removedImages: 0, removedVideos: 0, freedBytes: 0 }));
  });
  await openStorage(page);
  // 用键盘打开：焦点回到触发按钮针对键盘用户；WebKit 鼠标点击按钮不会让按钮获得焦点
  const openByKeyboard = async () => {
    await cleanButton(page).focus();
    await page.keyboard.press("Enter");
  };

  await openByKeyboard();
  await expect(dialog(page)).toContainText("清理未引用资源");
  await expect(dialog(page)).toContainText("将清理 2 张图片、1 个实况视频，释放 5.7 MB。清理后无法恢复。");
  await expect(dialog(page).getByRole("button", { name: "取消" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog(page).getByRole("button", { name: "清理" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog(page).getByRole("button", { name: "取消" })).toBeFocused();
  await dialog(page).getByRole("button", { name: "取消" }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(cleanButton(page)).toBeFocused();

  await openByKeyboard();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toHaveCount(0);
  await expect(cleanButton(page)).toBeFocused();
  expect(cleanups).toEqual([]);
});

test("[TC-US02-12][SC-CLEANUP-04] 清理进行中：只发一个请求，确认按钮 aria-busy 并禁用，Esc 不关闭", async ({ page }) => {
  await mockDetect(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let calls = 0;
  await page.route(CLEANUP, async (route) => {
    calls++;
    await gate;
    await route.fulfill(json({ removedImages: 2, removedVideos: 1, freedBytes: 6_000_000 }));
  });
  await openStorage(page);

  await cleanButton(page).click();
  const confirm = dialog(page).getByRole("button", { name: "清理" });
  await confirm.click();
  await expect(confirm).toHaveAttribute("aria-busy", "true");
  await expect(confirm).toBeDisabled();
  await confirm.click({ force: true }).catch(() => {});
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeVisible();
  release();
  await expect(dialog(page)).toHaveCount(0);
  expect(calls).toBe(1);
});

test("[TC-US02-13][SC-CLEANUP-05] 只有保护期内的记录：清理按钮禁用，点击不弹确认框", async ({ page }) => {
  await mockDetect(page, EMPTY);
  await openStorage(page);

  await expect(cleanButton(page)).toBeDisabled();
  await expect(page.getByText("存储状态良好，无未引用文件")).toBeVisible();
  await cleanButton(page).click({ force: true });
  await expect(dialog(page)).toHaveCount(0);
});

test("[TC-US02-14][SC-CLEANUP-09] 清理失败：关闭确认框、错误提示、自动重新检测，可再次清理", async ({ page }) => {
  const detect = await mockDetect(page);
  await page.route(CLEANUP, (route) => route.fulfill(json({ error: { code: "CLEANUP_FAILED", message: "清理未完成，请重试" } }, 500)));
  await openStorage(page);
  const before = detect.detections.length;

  await cleanButton(page).click();
  await dialog(page).getByRole("button", { name: "清理" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "清理未完成，请重试" })).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
  await expect.poll(() => detect.detections.length).toBeGreaterThan(before);
  await expect(cleanButton(page)).toBeEnabled();
});
