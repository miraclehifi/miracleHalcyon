import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { LIVE_MD, LIVE_MP, routeRaw, STORAGE, THUMBS } from "./support/afilmory";
import { waitForHydration } from "./support/hydration";

// US-13 Afilmory 外链照片（ADR-010）：写文章页预览与读者页。照片存储与照片信息接口全部打桩（support/afilmory.ts）
const preview = (page: Page) => page.getByTestId("md-preview");
const mounted = (page: Page) => preview(page).locator("figure[data-article-image]:has([data-status])");
const filler = Array.from({ length: 30 }, (_, i) => `前文段落 ${i + 1}。`).join("\n\n");

async function openDraft(page: Page, baseURL: string, body: string, title: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `[E2E-US13] ${title} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, body });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
}

const isMain = (range: string | null) => range === `bytes=0-${LIVE_MP.offset - 1}`;

// [TC-US13-08][SC-AFIL-08][SC-AFIL-12] 预览：预留比例、先缩略图；进入视口后按字节范围读主图；主图失败保留缩略图
test("[TC-US13-08] 预览中外链照片先显示缩略图，进入视口后换成主图", async ({ page, baseURL }) => {
  const requests = await routeRaw(page);
  await openDraft(page, baseURL!, `${filler}\n\n${LIVE_MD("", "图注")}\n\n结尾`, "主图");
  const figure = mounted(page);
  await expect(figure.locator("img")).toHaveAttribute("src", `${THUMBS}live.jpg`);
  await expect(figure.locator("[data-status]")).toHaveCSS("--rf-aspect", "960 / 1280");
  await expect(figure.locator("figcaption")).toHaveText("图注");
  expect(requests.filter((r) => r.url === `${STORAGE}e2e/live.jpg`)).toEqual([]);

  await figure.scrollIntoViewIfNeeded();
  await expect(figure.locator("img")).toHaveAttribute("src", /^blob:/);
  await expect(figure.locator("[data-status]")).toHaveAttribute("data-status", "complete");
  expect(requests.filter((r) => r.url === `${STORAGE}e2e/live.jpg`).map((r) => r.range)).toEqual([`bytes=0-${LIVE_MP.offset - 1}`]);
  expect(await figure.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(960);
});

test("[TC-US13-08] 主图读取失败时保留缩略图，不显示加载失败", async ({ page, baseURL }) => {
  const requests = await routeRaw(page, { fail: (_url, range) => isMain(range) });
  await openDraft(page, baseURL!, `${LIVE_MD("")}\n\n结尾`, "主图失败");
  const figure = mounted(page);
  await expect.poll(() => requests.some((r) => isMain(r.range))).toBe(true);
  await page.waitForTimeout(300);
  await expect(figure.locator("img")).toHaveAttribute("src", `${THUMBS}live.jpg`);
  await expect(figure.locator("[data-status]")).toHaveAttribute("data-status", "complete");
  await expect(figure.getByRole("button", { name: "重试" })).toHaveCount(0);
});

// ---- 粘贴分享代码 / 照片页链接（add-afilmory-paste）----
const SITE = "https://miraclehalcyon.afilmory.art";
const editor = (page: Page) => page.getByRole("textbox", { name: "正文" });
const cards = (page: Page) => preview(page).getByTestId("upload-card");
const embed = (attrs: string, src = `${SITE}/share/embed.js`) => `<script async src="${src}" ${attrs} data-width="100%"></script>`;
const info = (id: string, patch: Record<string, unknown> = {}) => ({
  id,
  url: `${STORAGE}${id}.jpg`,
  thumbnail: `${THUMBS}${id}.jpg`,
  width: 800,
  height: 600,
  rgb: "112233",
  ...patch,
});

// 派发带文本的 paste 事件（与 pasteFiles 相同的注入方式）；未被拦截时模拟浏览器默认行为插入文本
async function pasteText(page: Page, text: string) {
  await editor(page).evaluate((element, value) => {
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    if (element.dispatchEvent(event)) document.execCommand("insertText", false, value);
  }, text);
}

type PhotoReply = { status: number; body: unknown; delayMs?: number; hold?: Promise<void> };
// 扣住接口响应，直到看到卡片再放行（WebKit 预览渲染慢，固定延迟可能在卡片出现前就已替换完）
function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => (release = resolve));
  return { promise, release };
}
// 照片信息接口打桩：按 id 依次取回复（用到最后一个后一直沿用）；返回请求过的 id
async function stubPhotos(page: Page, replies: Record<string, PhotoReply[]>): Promise<string[]> {
  const asked: string[] = [];
  await page.route("**/api/admin/afilmory/photos/*", async (route) => {
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split("/").pop()!);
    asked.push(id);
    const queue = replies[id] ?? [{ status: 404, body: { error: { code: "NOT_FOUND", message: "Afilmory 中没有这张照片" } } }];
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    await reply.hold;
    if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
    await route.fulfill({ status: reply.status, contentType: "application/json", body: JSON.stringify(reply.body) });
  });
  return asked;
}
const ok = (id: string, patch?: Record<string, unknown>, delayMs?: number, hold?: Promise<void>): PhotoReply[] => [{ status: 200, body: info(id, patch), delayMs, hold }];

async function caretAt(page: Page, at: "first-line-end" | "end") {
  await editor(page).evaluate((element: HTMLTextAreaElement, where) => {
    element.focus();
    const offset = where === "end" ? element.value.length : element.value.indexOf("\n");
    element.setSelectionRange(offset, offset);
  }, at);
}

// [TC-US13-01][SC-AFIL-01] 单张分享代码：占位 + 卡片 → 照片引用；可撤销
test("[TC-US13-01] 粘贴单张分享代码插入外链照片", async ({ page, baseURL }) => {
  await routeRaw(page);
  const held = gate();
  const asked = await stubPhotos(page, { "18382": ok("18382", {}, 0, held.promise) });
  await openDraft(page, baseURL!, "第一行\n第二行", "单张");
  await caretAt(page, "first-line-end");
  await pasteText(page, embed('data-afilmory-photo="18382" data-aspect="800:600"'));
  await expect(editor(page)).toHaveValue("第一行![处理中…]()\n第二行");
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toContainText("正在获取照片信息…");
  held.release();
  await expect(editor(page)).toHaveValue(`第一行![](${STORAGE}18382.jpg#ext=800x600x112233)\n第二行`);
  await expect(cards(page)).toHaveCount(0);
  // 与文字同段 → 行内图片（US-12 规则），不挂载为单图；外链照片的行内图片用缩略图（不加载含视频的原图）
  await expect(preview(page).locator(`img[src="${THUMBS}18382.jpg"]`)).toHaveCount(1);
  expect(asked).toEqual(["18382"]);
  await editor(page).press("ControlOrMeta+z");
  await expect(editor(page)).toHaveValue("第一行![处理中…]()\n第二行");
});

// [TC-US13-02][SC-AFIL-01] 照片页链接，结果同分享代码
test("[TC-US13-02] 粘贴照片页链接插入外链照片", async ({ page, baseURL }) => {
  await routeRaw(page);
  await stubPhotos(page, { "18382": ok("18382") });
  await openDraft(page, baseURL!, "第一行\n第二行", "链接");
  await caretAt(page, "first-line-end");
  await pasteText(page, `  ${SITE}/photos/18382\n`);
  await expect(editor(page)).toHaveValue(`第一行![](${STORAGE}18382.jpg#ext=800x600x112233)\n第二行`);
});

// [TC-US13-03][SC-AFIL-02] 多张：每张一行、乱序返回仍按代码顺序、子目录地址编码、成为网格
test("[TC-US13-03] 粘贴多张分享代码成为组图", async ({ page, baseURL }) => {
  await routeRaw(page);
  const sub = `${STORAGE}%E6%89%8B%E5%8A%9E/wf2026/23473.jpg`;
  const held = gate(); // 放行后按 100 / 500 / 900ms 乱序返回
  await stubPhotos(page, {
    "23473": ok("23473", { url: sub, thumbnail: `${THUMBS}23473.jpg` }, 900, held.promise),
    "23514": ok("23514", {}, 100, held.promise),
    "18382": ok("18382", {}, 500, held.promise),
  });
  await openDraft(page, baseURL!, "", "多张");
  await caretAt(page, "end");
  await pasteText(page, embed('data-afilmory-photos="23473, 23514 ,18382"'));
  await expect(editor(page)).toHaveValue("![处理中…]()\n![处理中…]()\n![处理中…]()");
  await expect(cards(page)).toHaveCount(3);
  held.release();
  const ext = "#ext=800x600x112233";
  await expect(editor(page)).toHaveValue(`![](${sub}${ext})\n![](${STORAGE}23514.jpg${ext})\n![](${STORAGE}18382.jpg${ext})`);
  await expect(preview(page).locator('[data-image-gallery="grid"] [data-gallery-item]')).toHaveCount(3);
});

// [TC-US13-04][SC-AFIL-03] 按标签：源码不变、提示、不请求
test("[TC-US13-04] 按标签的分享代码不插入并提示", async ({ page, baseURL }) => {
  const asked = await stubPhotos(page, {});
  await openDraft(page, baseURL!, "原文", "标签");
  await caretAt(page, "end");
  await pasteText(page, embed('data-afilmory-tag="手办"'));
  await expect(page.getByRole("alert").filter({ hasText: "按标签分享的代码不能插入，请改用单张或多张分享" })).toBeVisible();
  await expect(editor(page)).toHaveValue("原文");
  expect(asked).toEqual([]);
});

// [TC-US13-05][SC-AFIL-04] 其他站点、非照片页、其他网址、夹带文字：按普通文本粘贴
test("[TC-US13-05] 非 Afilmory 照片的文本照常粘贴", async ({ page, baseURL }) => {
  const asked = await stubPhotos(page, {});
  await openDraft(page, baseURL!, "", "普通文本");
  await caretAt(page, "end");
  const texts = [
    embed('data-afilmory-photo="18382"', "https://other.afilmory.art/share/embed.js"),
    `${SITE}/`,
    "https://example.com/photos/18382",
    `看这张：${embed('data-afilmory-photo="18382"')}`,
  ];
  for (const text of texts) await pasteText(page, `${text}\n`);
  await expect(editor(page)).toHaveValue(texts.map((t) => `${t}\n`).join(""));
  await expect(cards(page)).toHaveCount(0);
  expect(asked).toEqual([]);
});

// [TC-US13-06][SC-AFIL-05] 502 → 失败卡片，重试成功；404 → 原因，移除删行
test("[TC-US13-06] 获取失败可重试、可移除", async ({ page, baseURL }) => {
  await routeRaw(page);
  await stubPhotos(page, {
    "18382": [{ status: 502, body: { error: { code: "UPSTREAM_UNAVAILABLE", message: "Afilmory 暂时无法访问" } } }, ...ok("18382")],
  });
  await openDraft(page, baseURL!, "", "失败");
  await caretAt(page, "end");
  await pasteText(page, embed('data-afilmory-photo="18382"'));
  await expect(cards(page)).toHaveAttribute("data-state", "error");
  await expect(cards(page)).toContainText("Afilmory 暂时无法访问");
  await expect(editor(page)).toHaveValue("![上传失败]()");
  await cards(page).getByRole("button", { name: "重试" }).click();
  await expect(editor(page)).toHaveValue(`![](${STORAGE}18382.jpg#ext=800x600x112233)`);

  await caretAt(page, "end");
  await page.keyboard.press("Enter");
  await pasteText(page, embed('data-afilmory-photo="99999"'));
  await expect(cards(page)).toContainText("Afilmory 中没有这张照片");
  await cards(page).getByRole("button", { name: "移除" }).click();
  // "移除"删掉占位所在整行（US-05）
  await expect(editor(page)).toHaveValue(`![](${STORAGE}18382.jpg#ext=800x600x112233)`);
});

// [TC-US13-07][SC-AFIL-06] 动态照片：开关开 → 带 live；关 → 不带，菜单可勾选；无 mp 的照片菜单没有"实况"
test("[TC-US13-07] 动态照片按实况开关插入，菜单可勾选实况", async ({ page, baseURL }) => {
  await routeRaw(page);
  await stubPhotos(page, { "18369": ok("18369", { video: { offset: 3337665, size: 14749941 } }), "18382": ok("18382") });
  await openDraft(page, baseURL!, "", "实况");
  const liveSwitch = page.getByRole("switch", { name: "实况照片" });
  if ((await liveSwitch.getAttribute("aria-checked")) !== "true") await liveSwitch.click();
  await caretAt(page, "end");
  await pasteText(page, embed('data-afilmory-photo="18369"'));
  const base = `![](${STORAGE}18369.jpg#ext=800x600x112233,mp=3337665+14749941`;
  await expect(editor(page)).toHaveValue(`${base},live)`);

  await liveSwitch.click();
  await expect(liveSwitch).toHaveAttribute("aria-checked", "false");
  await caretAt(page, "end");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await pasteText(page, embed('data-afilmory-photo="18369"'));
  await expect(editor(page)).toHaveValue(`${base},live)\n\n${base})`);

  const second = mounted(page).nth(1);
  await second.hover();
  await second.getByRole("button", { name: "图片选项" }).click();
  const liveItem = page.getByRole("menuitemcheckbox", { name: "实况" });
  await expect(liveItem).toHaveAttribute("aria-checked", "false");
  await liveItem.click();
  await expect(editor(page)).toHaveValue(`${base},live)\n\n${base},live)`);
  await page.keyboard.press("Escape");

  await caretAt(page, "end");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await pasteText(page, embed('data-afilmory-photo="18382"'));
  await expect(mounted(page)).toHaveCount(3);
  const third = mounted(page).nth(2);
  await third.hover();
  await third.getByRole("button", { name: "图片选项" }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "宽图" })).toBeVisible();
  await expect(page.getByRole("menuitemcheckbox", { name: "实况" })).toHaveCount(0);
});

// ---- 外链实况（add-external-live-playback）----
const isVideoRange = (range: string | null) => range === `bytes=${LIVE_MP.offset}-${LIVE_MP.offset + LIVE_MP.size - 1}`;

// [TC-US13-10][SC-AFIL-10] Playwright 自带的 Chromium 不能解码 HEVC（canPlayType hvc1 为空）：只显示静态图
test("[TC-US13-10] 不支持 HEVC 时外链实况退回静态图", async ({ page, baseURL, browserName }) => {
  test.skip(browserName !== "chromium", "依赖 Chromium 不支持 HEVC");
  const requests = await routeRaw(page);
  await openDraft(page, baseURL!, `${LIVE_MD()}\n\n结尾`, "实况退回");
  const figure = mounted(page);
  await expect(figure.locator("[data-status]")).toHaveAttribute("data-status", "complete");
  await figure.hover();
  await page.waitForTimeout(1000);
  await expect(figure.locator("[data-live-badge]")).toHaveCount(0);
  await expect(figure.locator("video")).toHaveCount(0);
  expect(requests.filter((r) => isVideoRange(r.range))).toEqual([]);
});

// [TC-US13-11][SC-AFIL-10] WebKit 支持 hvc1：显示 LIVE 标记，悬停时才读取视频字节范围（只读一次）。
// Windows 版 Playwright WebKit 的媒体后端不能播放 blob: 地址的视频（MEDIA_ERR_SRC_NOT_SUPPORTED，2026-10-21 实测；
// 真实 Safari / Chrome 可以），按验收数据策略以"error 后 LIVE 标记消失、不再尝试"为准；设置 src 并播放由 UT-174 覆盖
test("[TC-US13-11] 支持 HEVC 时悬停读取外链视频", async ({ page, baseURL, browserName }) => {
  test.skip(browserName !== "webkit", "依赖 WebKit 的 hvc1 支持");
  const requests = await routeRaw(page);
  await openDraft(page, baseURL!, `${LIVE_MD()}\n\n结尾`, "实况播放");
  const figure = mounted(page);
  await expect(figure.locator("[data-live-badge]")).toBeVisible({ timeout: 15_000 });
  expect(requests.filter((r) => isVideoRange(r.range))).toEqual([]);
  await figure.hover();
  await expect.poll(() => requests.filter((r) => isVideoRange(r.range)).length).toBe(1);
  await expect(figure.locator("[data-live-badge]")).toHaveCount(0);
  await page.mouse.move(0, 0);
  await figure.hover();
  await page.waitForTimeout(600);
  expect(requests.filter((r) => isVideoRange(r.range)).length).toBe(1);
});

// ---- 读者页：组图主色与灯箱主图（add-lightbox-external-main）。数据：reader-fixture 的 filler-23 ----
// [TC-US13-09][SC-AFIL-08][SC-AFIL-09] 网格主色；灯箱复用已读取的主图；切到未读取的照片先显示缩略图，读完换成主图
test("[TC-US13-09] 读者页外链照片的组图主色与灯箱主图", async ({ page }) => {
  let releaseGridC!: () => void;
  const gridC = new Promise<void>((resolve) => (releaseGridC = resolve));
  const requests = await routeRaw(page, { hold: (url) => (url === `${STORAGE}e2e/grid-c.jpg` ? gridC : undefined) });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/posts/filler-23");
  await waitForHydration(page);
  const content = page.locator("#article-content");

  const grid = content.locator('figure[data-image-gallery="grid"]');
  await grid.scrollIntoViewIfNeeded();
  await expect(grid.locator("[data-gallery-item]")).toHaveCount(3);
  expect(await grid.locator("[data-gallery-item]").evaluateAll((cells) => cells.map((cell) => (cell as HTMLElement).dataset.accent))).toEqual(["#556677", "#112233", "#445566"]);

  const live = content.locator(`figure[data-article-image][data-live]`);
  await live.scrollIntoViewIfNeeded();
  await expect(live.locator("img")).toHaveAttribute("src", /^blob:/);
  const main = await live.locator("img").getAttribute("src");

  await content.getByRole("button", { name: "查看大图：实况" }).click();
  const lightbox = page.getByRole("dialog", { name: "图片查看" });
  await expect(lightbox.getByRole("img", { name: "实况" })).toHaveAttribute("src", main!);
  expect(requests.filter((r) => r.url === `${STORAGE}e2e/live.jpg` && isMain(r.range))).toHaveLength(1);

  await page.keyboard.press("ArrowLeft");
  await expect(lightbox.locator("[data-lightbox-counter]")).toHaveText("3 / 5");
  await expect(lightbox.getByRole("img", { name: "网格三" })).toHaveAttribute("src", `${THUMBS}grid-c.jpg`);
  releaseGridC();
  await expect(lightbox.getByRole("img", { name: "网格三" })).toHaveAttribute("src", `${STORAGE}e2e/grid-c.jpg`);
});
