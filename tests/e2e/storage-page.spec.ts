import { expect, test, type Page } from "@playwright/test";
import { login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// F-006 US-01 存储页（admin-storage.md）。本地 D1 被并行用例共享且跨运行保留，统计数字不可预期：
// 除 TC-US01-09、10 外，检测接口用 page.route 返回固定数据（接口本身的判定由 tests/integration/media 覆盖）
const ORPHANS = "**/api/admin/storage/orphans";
const SUMMARY = {
  orphanImageCount: 12,
  orphanImageBytes: 18_450_120,
  orphanVideoCount: 3,
  orphanVideoBytes: 8_102_340,
  totalOrphanBytes: 26_552_460,
  protectedCount: 2,
};
const EMPTY = { orphanImageCount: 0, orphanImageBytes: 0, orphanVideoCount: 0, orphanVideoBytes: 0, totalOrphanBytes: 0, protectedCount: 1 };
const json = (body: unknown, status = 200) => ({ status, contentType: "application/json", body: JSON.stringify(body) });

async function mockOrphans(page: Page, summary = SUMMARY, checkedAt = new Date().toISOString()) {
  await page.route(ORPHANS, (route) => route.fulfill(json({ summary, checkedAt })));
}

const card = (page: Page, label: string) => page.locator("dl").filter({ hasText: label });

test("[TC-US01-01][SC-DETECT-01] 顶栏进入存储页：三项统计、体积、高亮合计、检测时间；顶栏当前项", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("link", { name: "文章" })).toHaveAttribute("aria-current", "page");
  await mockOrphans(page);
  await page.getByRole("link", { name: "存储" }).click();
  await expect(page).toHaveURL(/\/admin\/storage$/);
  await waitForHydration(page);

  await expect(card(page, "未引用图片")).toHaveText("未引用图片12 张17.6 MB");
  await expect(card(page, "未引用实况视频")).toHaveText("未引用实况视频3 个7.7 MB");
  await expect(card(page, "预计可释放")).toHaveText("预计可释放25.3 MB");
  await expect(card(page, "预计可释放")).toHaveAttribute("data-highlight", "true");
  await expect(page.getByText(/^检测于 \d{2}:\d{2}/)).toBeVisible();
  await expect(page.getByText("近 24 小时上传的 2 项不参与清理")).toBeVisible();
  await expect(page.getByRole("link", { name: "存储" })).toHaveAttribute("aria-current", "page");
});

test("[TC-US01-09][SC-DETECT-15] 未登录访问存储页跳转登录，登录后回到存储页", async ({ page }) => {
  await page.goto("/admin/storage");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fstorage$/);
});

test("[TC-US01-10][SC-DETECT-14] 存储页（真实接口）不请求任何 /img/，页面无 img / video", async ({ page }) => {
  await login(page);
  const media: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/img/")) media.push(request.url());
  });
  const detected = page.waitForResponse(ORPHANS);
  await page.goto("/admin/storage");
  expect((await detected).status()).toBe(200);
  await waitForHydration(page);
  const again = page.waitForResponse(ORPHANS);
  await page.getByRole("button", { name: "重新检测" }).first().click();
  await again;

  expect({ media, tags: await page.locator("img, video").count() }).toEqual({ media: [], tags: 0 });
});

test("[TC-US01-12][SC-DETECT-10] 无未引用资源：0 值、良好状态、清理按钮禁用、保护期提示", async ({ page }) => {
  await login(page);
  await mockOrphans(page, EMPTY);
  await page.goto("/admin/storage");
  await waitForHydration(page);

  await expect(page.getByText("存储状态良好，无未引用文件")).toBeVisible();
  await expect(page.getByRole("button", { name: "一键清理未引用资源" })).toBeDisabled();
  await expect(page.getByText("近 24 小时上传的 1 项不参与清理")).toBeVisible();
  await expect(card(page, "预计可释放")).toHaveText("预计可释放0 MB");
});

test("[TC-US01-13][SC-DETECT-11] 重新检测：统计与检测时间更新", async ({ page }) => {
  await login(page);
  let call = 0;
  await page.route(ORPHANS, (route) =>
    route.fulfill(json(++call === 1 ? { summary: SUMMARY, checkedAt: "2026-10-16T01:02:00.000Z" } : { summary: { ...SUMMARY, orphanImageCount: 0, orphanImageBytes: 0 }, checkedAt: "2026-10-16T01:04:00.000Z" })),
  );
  await page.goto("/admin/storage");
  await waitForHydration(page);
  await expect(card(page, "未引用图片")).toContainText("12 张");
  const first = await page.getByText(/^检测于/).textContent();

  await page.getByRole("button", { name: "重新检测" }).first().click();
  await expect(card(page, "未引用图片")).toContainText("0 张");
  await expect(page.getByText(/^检测于/)).not.toHaveText(first!);
});

test("[TC-US01-14][SC-DETECT-12] 检测中：统计区 aria-busy，重新检测与清理禁用", async ({ page }) => {
  await login(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(ORPHANS, async (route) => {
    await gate;
    await route.fulfill(json({ summary: SUMMARY, checkedAt: new Date().toISOString() }));
  });
  await page.goto("/admin/storage");
  await waitForHydration(page);

  await expect(page.getByRole("region", { name: "未引用资源" })).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "重新检测" }).first()).toBeDisabled();
  await expect(page.getByRole("button", { name: "一键清理未引用资源" })).toBeDisabled();
  release();
  await expect(page.getByRole("region", { name: "未引用资源" })).not.toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: "一键清理未引用资源" })).toBeEnabled();
});

test("[TC-US01-15][SC-DETECT-13] 检测失败：错误提示、清理禁用；重新检测恢复", async ({ page }) => {
  await login(page);
  let call = 0;
  await page.route(ORPHANS, (route) => (++call === 1 ? route.fulfill(json({ error: { code: "INTERNAL_ERROR", message: "检测失败，请重试" } }, 500)) : route.fulfill(json({ summary: SUMMARY, checkedAt: new Date().toISOString() }))));
  await page.goto("/admin/storage");
  await waitForHydration(page);

  await expect(page.getByRole("alert")).toHaveText("检测失败，请重试");
  await expect(page.getByRole("button", { name: "一键清理未引用资源" })).toBeDisabled();
  await page.getByRole("button", { name: "重新检测" }).first().click();
  await expect(card(page, "未引用图片")).toContainText("12 张");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("[TC-US01-01] 手机：顶栏为图标、统计卡片竖排、无横向滚动", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await mockOrphans(page);
  await page.goto("/admin/storage");
  await waitForHydration(page);
  await expect(card(page, "未引用图片")).toContainText("12 张");

  const boxes = await Promise.all(["未引用图片", "未引用实况视频", "预计可释放"].map((label) => card(page, label).boundingBox()));
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect({
    nav: await page.getByRole("link", { name: "存储" }).getByText("存储").count(),
    stacked: boxes[0]!.y < boxes[1]!.y && boxes[1]!.y < boxes[2]!.y && boxes[0]!.x === boxes[1]!.x,
    noHScroll: scrollWidth <= 390,
  }).toEqual({ nav: 0, stacked: true, noHScroll: true });
});
