// F-001 US-13 Afilmory 外链照片真实链路验证（verify 阶段，acceptance/post-editor/US-13-tests.md）：不打桩任何外部服务——
// 照片信息接口真实请求 miraclehalcyon.afilmory.art，浏览器真实按 Range 读取 GitHub raw。用完整版 Chromium（channel "chromium"，
// 能硬解 HEVC）验证外链实况真实播放：Playwright 自带的 Chromium 不支持 HEVC，Windows 版 WebKit 不能播放 blob 视频，自动化 E2E 覆盖不到。
// 执行：bash playwright-test-afilmory-live.sh。前置：服务已用 CLOUDFLARE_ENV=e2e 构建并运行（测试账号见 wrangler.jsonc env.e2e）
const { chromium } = require("playwright");
const path = require("node:path");

const TARGET_URL = /^https?:\/\//.test(process.env.PLAYWRIGHT_ENV ?? "") ? process.env.PLAYWRIGHT_ENV : "http://localhost:4321";
const USERNAME = "test-admin";
const PASSWORD = "Test-Passw0rd!";
const SITE = "https://miraclehalcyon.afilmory.art";
const STORAGE = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/";
// run.js 会把脚本复制到技能目录执行，__dirname 不可用：截图目录由 .sh 传入
const SHOTS = process.env.SHOTS_DIR ?? path.resolve(process.cwd(), "screenshots");
const embed = (attrs) => `<script async src="${SITE}/share/embed.js" ${attrs} data-width="100%"></script>`;

const results = [];
const rawRequests = [];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, error: error.message });
    console.log(`❌ ${name}\n   ${error.message}`);
  }
}

async function waitForServer() {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(`${TARGET_URL}/admin/login`)).ok) return;
    } catch {
      // 服务未就绪，稍后重试
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`服务未就绪：${TARGET_URL}`);
}

async function login(page) {
  await page.goto(`${TARGET_URL}/admin/login`);
  await page.waitForSelector("astro-island:not([ssr])");
  await page.getByLabel("账号").fill(USERNAME);
  await page.getByLabel("密码").fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin$/, { timeout: 30000 });
}

async function createDraft(page, title) {
  const headers = { Origin: new URL(TARGET_URL).origin };
  const data = { title, slug: "", tags: [], summary: "", body: "", publishedAt: null, cover: null };
  const response = await page.request.post(`${TARGET_URL}/api/admin/posts`, { headers, data });
  check(response.status() === 201, `新建草稿失败：${response.status()}`);
  return (await response.json()).id;
}

const editor = (page) => page.getByRole("textbox", { name: "正文" });
const preview = (page) => page.getByTestId("md-preview");

async function pasteAtEnd(page, text) {
  await editor(page).evaluate((element, value) => {
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
    const data = new DataTransfer();
    data.setData("text/plain", value);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    if (element.dispatchEvent(event)) document.execCommand("insertText", false, value);
  }, text);
}

async function waitForValue(page, predicate, message, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value = "";
  while (Date.now() < deadline) {
    value = await editor(page).inputValue();
    if (predicate(value)) return value;
    await page.waitForTimeout(250);
  }
  throw new Error(`${message}；源码为：${JSON.stringify(value)}`);
}

(async () => {
  await waitForServer();
  const browser = await chromium.launch({ channel: "chromium", headless: process.env.HEADLESS === "1" });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("request", (request) => {
    if (request.url().startsWith(STORAGE)) rawRequests.push({ url: request.url(), range: request.headers()["range"] ?? null });
  });

  await login(page);
  const id = await createDraft(page, `[VERIFY-US13] 真实链路 ${Date.now().toString(36)}`);
  await page.goto(`${TARGET_URL}/admin/posts/${id}`);
  await page.waitForSelector("astro-island:not([ssr])");

  const hevc = await page.evaluate(() => document.createElement("video").canPlayType('video/mp4; codecs="hvc1.2.4.L180.B0"'));
  console.log(`canPlayType(hvc1 Main 10) = ${JSON.stringify(hevc)}`);

  const live = `![](${STORAGE}18369.jpg#ext=3072x4096x8c778e,mp=3337665+14749941,live)`;
  await step("[TC-US13-01][TC-US13-07] 实况开关开启时粘贴真实单张分享代码 → 带 live 的外链引用", async () => {
    const liveSwitch = page.getByRole("switch", { name: "实况照片" });
    if ((await liveSwitch.getAttribute("aria-checked")) !== "true") await liveSwitch.click();
    await pasteAtEnd(page, embed('data-afilmory-photo="18369" data-aspect="3072:4096"'));
    await waitForValue(page, (value) => value === live, "源码未替换为预期引用");
  });

  await step("[TC-US13-08] 预览先显示缩略图，进入视口后按 Range 读主图（3072 宽）", async () => {
    const figure = preview(page).locator("figure[data-article-image]:has([data-status])").first();
    await figure.waitFor({ timeout: 15000 });
    const first = await figure.locator("img").getAttribute("src");
    check(first === `${STORAGE}.afilmory/thumbnails/18369.jpg` || first.startsWith("blob:"), `首屏 img 不是缩略图：${first}`);
    await figure.scrollIntoViewIfNeeded();
    await page.waitForFunction((el) => el.querySelector("img").src.startsWith("blob:") && el.querySelector("img").naturalWidth > 0, await figure.elementHandle(), { timeout: 60000 });
    const width = await figure.locator("img").evaluate((img) => img.naturalWidth);
    check(width === 3072, `主图宽度 ${width}`);
    check(rawRequests.some((r) => r.url === `${STORAGE}18369.jpg` && r.range === "bytes=0-3337664"), "没有按 Range 读取主图");
    await page.screenshot({ path: path.join(SHOTS, "us13-live-main.png") });
  });

  await step("[TC-US13-10/11] 真实 HEVC：显示 LIVE，悬停读取视频范围并播放", async () => {
    const figure = preview(page).locator("figure[data-article-image]:has([data-status])").first();
    await figure.locator("[data-live-badge]").waitFor({ timeout: 15000 });
    await figure.hover();
    await page.waitForFunction(
      (el) => {
        const video = el.querySelector("video");
        return video && video.currentTime > 0.3 && !video.error;
      },
      await figure.elementHandle(),
      { timeout: 60000 },
    );
    check(rawRequests.some((r) => r.url === `${STORAGE}18369.jpg` && r.range === "bytes=3337665-18087605"), "没有按 Range 读取视频");
    const state = await figure.locator("video").evaluate((video) => ({ src: video.src.slice(0, 5), time: video.currentTime, w: video.videoWidth, h: video.videoHeight }));
    console.log(`   视频：${JSON.stringify(state)}`);
    check(state.src === "blob:" && state.w > 0, `视频未解码：${JSON.stringify(state)}`);
    await page.screenshot({ path: path.join(SHOTS, "us13-live-playing.png") });
    await page.mouse.move(0, 0);
  });

  await step("[TC-US13-03] 粘贴真实多张分享代码 → 三行、子目录地址编码、网格组图", async () => {
    // 先另起一段（粘贴被拦截时不会带上前面的换行），再粘贴
    await editor(page).evaluate((element) => {
      element.focus();
      element.setSelectionRange(element.value.length, element.value.length);
      document.execCommand("insertText", false, "\n\n");
    });
    await pasteAtEnd(page, embed('data-afilmory-photos="23473,18382,9332"'));
    const value = await waitForValue(page, (v) => !v.includes("处理中…") && v.split("\n").length >= 5, "多张未全部替换");
    const lines = value.split("\n").slice(-3);
    check(lines.length === 3 && lines.every((line) => line.startsWith(`![](${STORAGE}`)), `多张引用：${JSON.stringify(lines)}`);
    check(lines[0].startsWith(`![](${STORAGE}%E6%89%8B%E5%8A%9E/wf2026/23473.jpg#ext=4338x3254x`), `子目录地址：${lines[0]}`);
    const grid = preview(page).locator('figure[data-image-gallery="grid"]');
    await grid.waitFor({ timeout: 15000 });
    await grid.scrollIntoViewIfNeeded();
    const count = await grid.locator("[data-gallery-item]").count();
    check(count === 3, `网格单元格 ${count}`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SHOTS, "us13-grid.png") });
  });

  await step("[TC-US13-04] 粘贴按标签的分享代码 → 提示、不插入", async () => {
    const before = await editor(page).inputValue();
    await pasteAtEnd(page, embed('data-afilmory-tag="手办"'));
    await page.getByRole("alert").filter({ hasText: "按标签分享的代码不能插入" }).waitFor({ timeout: 10000 });
    check((await editor(page).inputValue()) === before, "源码被改动");
  });

  await step("[ADR-010] 动态照片原图从不整体下载（只按 Range 读主图与视频）", async () => {
    const whole = rawRequests.filter((r) => r.url === `${STORAGE}18369.jpg` && !r.range);
    check(whole.length === 0, `有 ${whole.length} 次不带 Range 的 18369.jpg 请求`);
  });

  console.log("\nGitHub raw 请求：");
  for (const r of rawRequests) console.log(`  ${r.range ?? "(无 Range)"}  ${decodeURI(r.url.replace(STORAGE, ""))}`);
  const failed = results.filter((r) => !r.ok);
  console.log(`\n结果：${results.length - failed.length} / ${results.length} 通过`);
  await browser.close();
  process.exitCode = failed.length ? 1 : 0;
})();
