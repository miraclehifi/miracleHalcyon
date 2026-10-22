import { expect, test, type Page, type Route } from "@playwright/test";
import { login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { PREFIX, shelfApi } from "./support/shelf";

// F-005 US-02 表单识别框（admin-media.md"RecognizeBox"）。识别接口用 page.route 打桩（豆瓣数据形态以夹具为准，接口本身由集成测试覆盖）
test.afterAll(async ({ browser, baseURL }) => {
  const page = await browser.newPage();
  await login(page);
  await shelfApi(page.request, baseURL!).removeByPrefix();
  await page.close();
});

const JPEG_DATA =
  "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
const RECOGNIZE = "**/api/admin/shelf/recognize";

interface Fields {
  type?: string;
  title?: string;
  creator?: string | null;
  year?: number | null;
  coverData?: string | null;
  doubanId?: string;
}

const success = (f: Fields = {}, missing: string[] = []) => {
  const doubanId = f.doubanId ?? "27608239";
  const type = f.type ?? "book";
  const host = type === "book" || type === "comic" ? "book" : type === "game" || type === "boardgame" ? "www" : "movie";
  const doubanUrl = host === "www" ? `https://www.douban.com/game/${doubanId}/` : `https://${host}.douban.com/subject/${doubanId}/`;
  return { fields: { type, title: `${PREFIX} 原则`, creator: "瑞·达利欧", year: 2018, coverData: JPEG_DATA, ...f, doubanUrl, doubanId }, missing };
};
const reply = (body: unknown, status = 200) => (route: Route) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

async function openNew(page: Page, type = "book") {
  await login(page);
  await page.goto(`/admin/media/new?type=${type}`);
  await waitForHydration(page);
}

const box = (page: Page) => page.getByLabel("豆瓣分享内容");
const recognizeButton = (page: Page) => page.getByRole("button", { name: /^识别/ });
async function runRecognize(page: Page, text = "https://book.douban.com/subject/27608239/") {
  await box(page).fill(text);
  await recognizeButton(page).click();
}

test("[TC-US02-14][SC-RECOG-02][SC-RECOG-07] 主流程：识别 → 改分类与标题 → 保存", async ({ page }) => {
  const doubanId = String(Math.floor(Math.random() * 1e9) + 1e9);
  await page.route(RECOGNIZE, reply(success({ type: "series", title: `${PREFIX} 某剧 第一季`, creator: "申元浩", year: 2015, doubanId })));
  await openNew(page);
  await runRecognize(page, `https://movie.douban.com/subject/${doubanId}/`);
  await expect(page.getByLabel("标题")).toHaveValue(`${PREFIX} 某剧 第一季`);
  await page.getByLabel("分类").selectOption("movie");
  await page.getByLabel("标题").fill(`${PREFIX} 某剧`);
  await page.getByRole("radio", { name: "看过" }).click();
  await page.getByRole("button", { name: "保存" }).click();

  await expect(page).toHaveURL(/\/admin\/media\?type=movie$/);
  const saved = page.locator("li[data-entry-id]").filter({ hasText: `${PREFIX} 某剧` });
  await expect(saved).toHaveCount(1);
  await expect(saved.locator("img").first()).toHaveAttribute("src", /^\/covers\//);
  await saved.getByRole("link", { name: `${PREFIX} 某剧` }).first().click();
  await waitForHydration(page);
  await expect(page.getByText(`https://movie.douban.com/subject/${doubanId}/`, { exact: true })).toBeVisible();
});

test("[TC-US02-15][SC-RECOG-01] 初始态；粘贴不自动识别", async ({ page }) => {
  let calls = 0;
  await page.route(RECOGNIZE, (route) => {
    calls++;
    return reply(success())(route);
  });
  await openNew(page);
  await expect(box(page)).toHaveAttribute("placeholder", "粘贴豆瓣分享链接或分享文字，自动识别条目信息");
  await expect(page.getByRole("button", { name: "清空" })).toHaveCount(0);
  await box(page).fill("https://book.douban.com/subject/27608239/");
  await expect(page.getByRole("button", { name: "清空" })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(calls).toBe(0);
});

test("[TC-US02-16][SC-RECOG-16] 空白内容时识别禁用", async ({ page }) => {
  await openNew(page);
  await expect(recognizeButton(page)).toBeDisabled();
  await box(page).fill("  \n ");
  await expect(recognizeButton(page)).toBeDisabled();
  await box(page).fill("x");
  await expect(recognizeButton(page)).toBeEnabled();
});

test("[TC-US02-17][SC-RECOG-17] 识别中加载态，表单可继续输入 @timing", async ({ page }) => {
  await page.route(RECOGNIZE, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await reply(success())(route);
  });
  await openNew(page);
  await runRecognize(page);
  await expect(recognizeButton(page)).toHaveAttribute("aria-busy", "true");
  await expect(recognizeButton(page)).toBeDisabled();
  await page.getByLabel("短评").fill("等待中输入");
  await page.getByRole("radio", { name: "3 星" }).click();
  await expect(page.getByLabel("标题")).toHaveValue(`${PREFIX} 原则`);
  await expect(page.getByLabel("短评")).toHaveValue("等待中输入");
  await expect(page.getByText("3 / 5")).toBeVisible();
});

test("[TC-US02-18][SC-RECOG-07][SC-RECOG-08] 只覆盖识别到的字段，提示已识别 / 未识别", async ({ page }) => {
  await page.route(RECOGNIZE, reply(success({ year: null }, ["year"])));
  await openNew(page);
  await page.getByRole("radio", { name: "在读" }).click();
  await page.getByRole("radio", { name: "4 星" }).click();
  await page.getByLabel(/标记日期/).fill("2026-09-01");
  await page.getByLabel("短评").fill("还行");
  await page.getByLabel("年份").fill("2020");
  await runRecognize(page);

  await expect(page.getByLabel("标题")).toHaveValue(`${PREFIX} 原则`);
  await expect(page.getByLabel("标题")).toHaveAttribute("data-recognized", "true");
  await expect(page.getByLabel("作者")).toHaveValue("瑞·达利欧");
  await expect(page.getByRole("img", { name: "封面预览" })).toHaveAttribute("src", /^data:image/);
  await expect(page.getByLabel("年份")).toHaveValue("2020");
  await expect(page.getByRole("radio", { name: "在读" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("4 / 5")).toBeVisible();
  await expect(page.getByLabel(/标记日期/)).toHaveValue("2026-09-01");
  await expect(page.getByLabel("短评")).toHaveValue("还行");
  const status = page.getByRole("status");
  await expect(status).toContainText("已识别：分类、标题、封面、作者");
  await expect(status).toContainText("未识别：年份，请手动填写");
  await expect(page.getByLabel("标题")).not.toHaveAttribute("data-recognized", "true", { timeout: 3000 });
});

test("[TC-US02-19][SC-RECOG-13][SC-RECOG-14][SC-RECOG-15] 失败提示，表单不变，手填后可保存", async ({ page }) => {
  const replies = [
    ...["NOT_DOUBAN_LINK", "NOT_SUBJECT_LINK", "FETCH_FAILED", "PARSE_FAILED"].map((code) => reply({ error: { code, message: code } }, 422)),
    reply({ error: { code: "INTERNAL", message: "x" } }, 500),
  ];
  let n = 0;
  await page.route(RECOGNIZE, (route) => replies[n++](route));
  await openNew(page);
  await page.getByLabel("作者").fill("手填作者");
  const status = page.getByRole("status");
  for (const text of ["不是豆瓣链接", "不是豆瓣条目链接", "链接打不开", "解析不出条目信息", "识别失败，请稍后重试"]) {
    await runRecognize(page, "https://example.com/x");
    await expect(status).toContainText(text);
  }
  await expect(page.getByLabel("标题")).toHaveValue("");
  await expect(page.getByLabel("作者")).toHaveValue("手填作者");
  await page.getByLabel("标题").fill(`${PREFIX} 手填`);
  await page.getByRole("button", { name: "保存" }).click();
  await expect(page).toHaveURL(/\/admin\/media\?type=book$/);
});

test("[TC-US02-20][SC-RECOG-18][SC-RECOG-19] 重复提示与去编辑（未保存先确认）", async ({ page, baseURL }) => {
  await login(page);
  const existing = await shelfApi(page.request, baseURL!).create({ title: `${PREFIX} 原则`, markedOn: "2026-10-01" });
  await page.route(RECOGNIZE, reply({ duplicate: { id: existing.id, title: existing.title, type: "book", status: "completed", markedOn: "2026-10-01" } }));
  await page.goto("/admin/media/new?type=book");
  await waitForHydration(page);
  await page.getByLabel("短评").fill("还没保存");
  await runRecognize(page);
  const status = page.getByRole("status");
  await expect(status).toContainText(`这条已经录入过：《${existing.title}》 · 读过 2026-10-01`);
  await expect(page.getByLabel("标题")).toHaveValue("");

  await page.getByRole("button", { name: /去编辑/ }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("放弃当前填写的内容？");
  await dialog.getByRole("button", { name: "放弃并前往" }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/media/${existing.id}$`));
  await waitForHydration(page);
  await expect(page.getByLabel("标题")).toHaveValue(existing.title);
});

test("[TC-US02-21][SC-RECOG-20] 清空后再识别覆盖", async ({ page }) => {
  await page.route(RECOGNIZE, async (route) => {
    const { text } = route.request().postDataJSON() as { text: string };
    const b = text.includes("1292052");
    await reply(success(b ? { type: "movie", title: `${PREFIX} 肖申克的救赎`, creator: "弗兰克·德拉邦特", year: 1994, doubanId: "1292052" } : {}))(route);
  });
  await openNew(page);
  await runRecognize(page);
  await expect(page.getByLabel("标题")).toHaveValue(`${PREFIX} 原则`);
  await page.getByRole("button", { name: "清空" }).click();
  await expect(box(page)).toHaveValue("");
  await expect(box(page)).toBeFocused();
  await runRecognize(page, "https://movie.douban.com/subject/1292052/");
  await expect(page.getByLabel("标题")).toHaveValue(`${PREFIX} 肖申克的救赎`);
  await expect(page.getByLabel("导演")).toHaveValue("弗兰克·德拉邦特");
  await expect(page.getByLabel("年份")).toHaveValue("1994");
  await expect(page.locator("span").getByText("https://movie.douban.com/subject/1292052/", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("已识别：分类、标题、封面、导演、年份");
});

test("[TC-US02-22][SC-RECOG-21][SC-RECOG-22] 封面预览不请求豆瓣；封面缺失提示", async ({ page }) => {
  const douban: string[] = [];
  page.on("request", (r) => void (/douban(io)?\.com$/.test(new URL(r.url()).hostname) && douban.push(r.url())));
  let n = 0;
  await page.route(RECOGNIZE, (route) => reply(n++ === 0 ? success() : success({ coverData: null }, ["cover"]))(route));
  await openNew(page);
  await runRecognize(page);
  await expect(page.getByRole("img", { name: "封面预览" })).toHaveAttribute("src", /^data:image/);
  await page.getByRole("button", { name: "移除封面" }).click();
  await runRecognize(page);
  await expect(page.getByRole("status")).toContainText("未识别：封面，可手动上传");
  await expect(page.getByRole("img", { name: "封面预览" })).toHaveCount(0);
  expect(douban).toEqual([]);
});
