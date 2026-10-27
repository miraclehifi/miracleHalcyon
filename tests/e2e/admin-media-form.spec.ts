import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { PREFIX, shelfApi } from "./support/shelf";

// F-005 US-01 书影音录入 / 编辑页（admin-media.md §二）。条目标题带唯一前缀，结束按前缀删除（本地 D1 跨运行共享）
test.afterAll(async ({ browser, baseURL }) => {
  const page = await browser.newPage();
  await login(page);
  await shelfApi(page.request, baseURL!).removeByPrefix();
  await page.close();
});

// 1×1 JPEG（服务端按文件头判定类型）
const JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "base64",
);
const jpg = (name = "cover.jpg") => ({ name, mimeType: "image/jpeg", buffer: JPEG });

async function openNew(page: Page, type = "book") {
  await page.goto(`/admin/media/new?type=${type}`);
  await waitForHydration(page);
  await expect(page.getByRole("heading", { name: "新增条目" })).toBeVisible();
}

const saveButton = (page: Page) => page.getByRole("button", { name: "保存" });
const row = (page: Page, title: string) => page.locator("li[data-entry-id]").filter({ hasText: title });

test("[TC-US01-16][SC-MANAGE-05][SC-MANAGE-06] 新增主流程：填表、评分、封面，保存后回列表可见", async ({ page }) => {
  await login(page);
  await page.goto("/admin/media?type=book");
  await waitForHydration(page);
  await page.getByRole("button", { name: "新增条目" }).first().click();
  await expect(page).toHaveURL(/\/admin\/media\/new\?type=book$/);
  await waitForHydration(page);

  const title = `${PREFIX} 原则`;
  await page.getByLabel("标题").fill(title);
  await page.getByLabel("作者").fill("瑞·达利欧");
  await page.getByRole("radio", { name: "4 星" }).click();
  await page.getByLabel("封面", { exact: true }).setInputFiles(jpg());
  await expect(page.getByRole("img", { name: "封面预览" })).toBeVisible();
  await saveButton(page).click();

  await expect(page).toHaveURL(/\/admin\/media\?type=book$/);
  await expect(page.getByText("已保存，读者页将在重建后更新")).toBeVisible();
  const saved = row(page, title);
  await expect(saved).toBeVisible();
  await expect(saved.getByRole("img", { name: "评分 4 / 5" }).first()).toBeVisible();
  await expect(saved.locator("img").first()).toHaveAttribute("src", /^\/covers\/\d{4}\/\d{2}\/[a-z2-7]{12}\.jpg$/);
});

test("[TC-US01-18][SC-MANAGE-04] 新增表单默认值：入口分类、看过、今天", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-10-21T08:00:00"));
  await login(page);
  await openNew(page, "movie");
  await expect(page.getByLabel("分类")).toHaveValue("movie");
  await expect(page.getByRole("radio", { name: "看过" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("标记日期")).toHaveValue("2026-10-21");
  await expect(page.getByLabel("标题")).toHaveValue("");
  await expect(page.getByLabel("导演")).toHaveValue("");
  await expect(page.getByText("未评分")).toBeVisible();
});

test("[TC-US01-19][SC-MANAGE-07] 前端必填校验不发请求，焦点到第一个出错字段", async ({ page }) => {
  await login(page);
  await openNew(page);
  let posts = 0;
  page.on("request", (r) => void (r.method() === "POST" && r.url().includes("/shelf/entries") && posts++));

  await page.getByLabel("标题").fill("   ");
  await page.getByLabel("作者").fill("作者甲");
  await saveButton(page).click();
  await expect(page.getByText("请填写标题")).toBeVisible();
  await expect(page.getByLabel("标题")).toBeFocused();

  await page.getByLabel("标题").fill("x");
  await page.getByLabel("年份").fill("23");
  await saveButton(page).click();
  await expect(page.getByText("年份为 4 位数字")).toBeVisible();
  await expect(page.getByLabel("年份")).toBeFocused();
  await expect(page.getByLabel("作者")).toHaveValue("作者甲");
  expect(posts).toBe(0);
});

test("[TC-US01-20][SC-MANAGE-09] 状态动词随分类切换，保留进行中", async ({ page }) => {
  await login(page);
  await openNew(page);
  const status = page.getByRole("radiogroup", { name: "状态" });
  await expect(status.getByRole("radio")).toHaveText(["读过", "在读"]);
  await page.getByLabel("分类").selectOption("series");
  await expect(status.getByRole("radio")).toHaveText(["看过", "在看"]);
  await status.getByRole("radio", { name: "在看" }).click();
  await page.getByLabel("分类").selectOption("boardgame");
  await expect(status.getByRole("radio")).toHaveText(["玩过", "在玩"]);
  await expect(status.getByRole("radio", { name: "在玩" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("标记日期（开始日期）")).toBeVisible();
});

test("[TC-US01-21][SC-MANAGE-10][SC-MANAGE-11] 封面预览与拒绝提示", async ({ page }) => {
  await login(page);
  await openNew(page);
  const cover = page.getByLabel("封面", { exact: true });
  await cover.setInputFiles(jpg());
  const preview = page.getByRole("img", { name: "封面预览" });
  const src = await preview.getAttribute("src");

  await cover.setInputFiles({ name: "a.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") });
  await expect(page.getByRole("alert")).toContainText("封面只支持 jpg / png / webp，且不超过 5 MB");
  await expect(preview).toHaveAttribute("src", src!);

  await cover.setInputFiles({ name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.concat([JPEG, Buffer.alloc(6 * 1024 * 1024)]) });
  await expect(page.getByRole("alert")).toContainText("不超过 5 MB");
  await expect(preview).toHaveAttribute("src", src!);
});

test("[TC-US01-24][SC-MANAGE-17] 保存中加载态与防重复提交 @timing", async ({ page }) => {
  await login(page);
  await openNew(page);
  let posts = 0;
  await page.route("**/api/admin/shelf/entries", async (route) => {
    posts++;
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });
  await page.getByLabel("标题").fill(`${PREFIX} 防重复`);
  await saveButton(page).click();
  await expect(saveButton(page)).toBeDisabled();
  await expect(saveButton(page)).toHaveAttribute("aria-busy", "true");
  await saveButton(page).click({ force: true });
  await saveButton(page).click({ force: true });
  await expect(page).toHaveURL(/\/admin\/media\?type=book$/);
  expect(posts).toBe(1);
});

test("[TC-US01-25][SC-MANAGE-18] 保存失败提示并保留内容", async ({ page }) => {
  await login(page);
  await openNew(page);
  await page.route("**/api/admin/shelf/entries", (route) => route.fulfill({ status: 500, body: "" }));
  await page.getByLabel("标题").fill(`${PREFIX} 失败`);
  await page.getByLabel("作者").fill("作者乙");
  await saveButton(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "保存失败，请重试" })).toBeVisible();
  await expect(page.getByLabel("标题")).toHaveValue(`${PREFIX} 失败`);
  await expect(saveButton(page)).toBeEnabled();

  await page.unroute("**/api/admin/shelf/entries");
  await page.route("**/api/admin/shelf/entries", (route) => route.abort());
  await saveButton(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "保存失败，请重试" }).first()).toBeVisible();
  await expect(page.getByLabel("作者")).toHaveValue("作者乙");
  await expect(saveButton(page)).toBeEnabled();
});

test("[SC-MANAGE-13][SC-MANAGE-12][SC-MANAGE-15] 编辑：在读改读过后排序变化、换封面、编辑页删除", async ({ page, baseURL }) => {
  await login(page);
  const api = shelfApi(page.request, baseURL!);
  const reading = await api.create({ title: `${PREFIX} 编辑 在读`, status: "in_progress", markedOn: "2026-01-01" });
  await api.create({ title: `${PREFIX} 编辑 读过`, status: "completed", markedOn: "2026-06-01" });

  await page.goto(`/admin/media/${reading.id}`);
  await waitForHydration(page);
  await expect(page.getByRole("heading", { name: "编辑条目" })).toBeVisible();
  await expect(page.getByLabel("标题")).toHaveValue(reading.title);
  await page.getByRole("radio", { name: "读过" }).click();
  await page.getByLabel("封面", { exact: true }).setInputFiles(jpg());
  await saveButton(page).click();
  await expect(page).toHaveURL(/\/admin\/media\?type=book$/);
  const mine = page.locator("li[data-entry-id]").filter({ hasText: `${PREFIX} 编辑` });
  await expect(mine.first()).toContainText("编辑 读过"); // 已不再置顶：2026-06-01 晚于 2026-01-01
  const firstCover = await row(page, reading.title).locator("img").first().getAttribute("src");
  expect(firstCover).toMatch(/^\/covers\//);

  await page.goto(`/admin/media/${reading.id}`);
  await waitForHydration(page);
  await page.getByLabel("封面", { exact: true }).setInputFiles(jpg("second.jpg"));
  await saveButton(page).click();
  await expect(page).toHaveURL(/\/admin\/media\?type=book$/);
  await expect(row(page, reading.title).locator("img").first()).not.toHaveAttribute("src", firstCover!);

  await page.goto(`/admin/media/${reading.id}`);
  await waitForHydration(page);
  await page.getByRole("button", { name: "删除" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "删除" }).click();
  await expect(page).toHaveURL(/\/admin\/media\?type=book$/);
  await expect(page.getByText(`已删除《${reading.title}》`)).toBeVisible();
  await expect(row(page, reading.title)).toHaveCount(0);
});

test("[SC-MANAGE-19] 有改动时取消先确认", async ({ page }) => {
  await login(page);
  await openNew(page);
  await page.getByLabel("标题").fill("未保存");
  await page.getByRole("button", { name: "取消" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("放弃未保存的改动？");
  await dialog.getByRole("button", { name: "继续填写" }).click();
  await expect(page.getByLabel("标题")).toHaveValue("未保存");
  await page.getByRole("button", { name: "取消" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "放弃" }).click();
  await expect(page).toHaveURL(/\/admin\/media\?type=book$/);
});

// 游戏：平台下拉与 IGDB 封面链接（admin-media.md"游戏专属"，ADR-013）。images.igdb.com 由 page.route 冒充（co8h3y → 810×1080 夹具，其余 404）
const IGDB_JPG = readFileSync("tests/fixtures/igdb/co8h3y-810x1080.jpg");

test("[TC-US01-29][SC-MANAGE-23][SC-MANAGE-24][SC-MANAGE-25] 游戏表单：平台、封面链接预览比例、切换分类、错误提示", async ({ page, browserName }) => {
  await page.route("https://images.igdb.com/**", (route) =>
    /\/co8h3y\.jpg$/.test(route.request().url()) ? route.fulfill({ contentType: "image/jpeg", body: IGDB_JPG }) : route.fulfill({ status: 404 }),
  );
  await login(page);
  await openNew(page, "game");

  // 1：平台下拉默认 PS5、选项顺序；封面区无"上传"，有链接输入
  const platform = page.getByLabel("平台");
  await expect(platform).toHaveValue("ps5");
  await expect(platform.locator("option")).toHaveText(["PS5", "PS4", "Switch", "Switch 2", "Steam"]);
  await expect(page.getByRole("button", { name: "上传" })).toHaveCount(0);
  const link = page.getByLabel("封面链接（IGDB）");

  // 2：粘贴链接 → 预览按原图比例（WebKit 的图片请求不经 page.route，比例只在 chromium 断言）
  await link.fill("https://images.igdb.com/igdb/image/upload/t_cover_big/co8h3y.webp");
  const preview = page.getByRole("img", { name: "封面预览" });
  await expect(preview).toHaveAttribute("src", "https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg");
  if (browserName === "chromium") {
    await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(810);
    const box = await preview.boundingBox();
    expect(Math.abs(box!.width / box!.height - 810 / 1080)).toBeLessThan(0.01 * (810 / 1080));
    await expect(preview).toHaveCSS("object-fit", "contain");
  }

  // 3：改为书 → 平台与链接消失、"上传"恢复；改回游戏 → 值保留
  await page.getByLabel("分类").selectOption("book");
  await expect(platform).toHaveCount(0);
  await expect(page.getByRole("button", { name: "上传" })).toBeVisible();
  await page.getByLabel("分类").selectOption("game");
  await expect(platform).toHaveValue("ps5");
  await expect(link).toHaveValue("https://images.igdb.com/igdb/image/upload/t_cover_big/co8h3y.webp");

  // 4：链接格式不对 → 不发请求，字段下提示
  let saves = 0;
  await page.route("**/api/admin/shelf/entries", async (route) => {
    saves++;
    await route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: { code: "COVER_LINK_UNREACHABLE", message: "封面链接打不开，请检查后重试" } }) });
  });
  await page.getByLabel("标题").fill(`${PREFIX} 塞尔达`);
  await link.fill("https://example.com/a.jpg");
  await saveButton(page).click();
  await expect(page.getByText("请粘贴 images.igdb.com 的封面图片地址")).toBeVisible();
  await expect(link).toBeFocused();
  expect(saves).toBe(0);

  // 5：保存接口 422 → 链接下提示"打不开"，表单内容保留
  await link.fill("https://images.igdb.com/igdb/image/upload/t_1080p/nope000.jpg");
  await saveButton(page).click();
  await expect(page.getByText("封面链接打不开，请检查后重试")).toBeVisible();
  await expect(link).toBeFocused();
  await expect(page.getByLabel("标题")).toHaveValue(`${PREFIX} 塞尔达`);
  expect(saves).toBe(1);
});
