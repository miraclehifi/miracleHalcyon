// F-001 US-03 写文章页 UI 交互验收（acceptance/post-editor/US-03-tests.md）：TC-US03-17、19、20、21、24、25、26
// 由 implement（build-editor-page-shell ~ build-tag-input）生成，verify 阶段执行：bash playwright-test-editor-ui.sh
// 前置：服务已用 CLOUDFLARE_ENV=e2e 构建并运行（测试账号见 wrangler.jsonc env.e2e），本地 D1 已迁移
const { chromium } = require("playwright");

const TARGET_URL = /^https?:\/\//.test(process.env.PLAYWRIGHT_ENV ?? "") ? process.env.PLAYWRIGHT_ENV : "http://localhost:4321";
const USERNAME = "test-admin";
const PASSWORD = "Test-Passw0rd!";
const PREFIX = `ed${Date.now().toString(36)}`;

const results = [];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(page) {
  await page.goto(`${TARGET_URL}/admin/login`);
  await page.waitForSelector("astro-island:not([ssr])");
  await page.getByLabel("账号").fill(USERNAME);
  await page.getByLabel("密码").fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForURL(/\/admin$/);
}

function api(page) {
  const headers = { Origin: new URL(TARGET_URL).origin };
  const draft = (fields) => ({ title: "", slug: "", tags: [], summary: "", body: "", publishedAt: null, cover: null, ...fields }); // DraftInput 七字段必填（F-002 起含 cover）
  return {
    create: async (fields) => (await (await page.request.post(`${TARGET_URL}/api/admin/posts`, { headers, data: draft(fields) })).json()).id,
    save: (id, fields) => page.request.put(`${TARGET_URL}/api/admin/posts/${id}`, { headers, data: draft(fields) }),
  };
}

async function run(title, body) {
  const browser = await chromium.launch({ headless: process.env.HEADLESS === "1", slowMo: 50 });
  const page = await (await browser.newContext({ timezoneId: "Asia/Shanghai" })).newPage();
  try {
    await login(page);
    await body({ page, api: api(page) });
    results.push({ title, ok: true });
    console.log(`✅ ${title}`);
  } catch (error) {
    results.push({ title, ok: false, error: error.message });
    console.log(`❌ ${title}\n   ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function openEditor(page, path) {
  await page.goto(`${TARGET_URL}${path}`);
  await page.waitForSelector("astro-island:not([ssr])");
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date());

(async () => {
  console.log(`被测站点：${TARGET_URL}`);

  await run("[SC-POSTINFO-01] TC-US03-17 新建文章显示空白表单，发布日期默认今天，徽标\"草稿\"", async ({ page }) => {
    await page.getByRole("button", { name: "新建文章" }).click();
    await page.waitForURL(/\/admin\/posts\/new$/);
    await page.waitForSelector("astro-island:not([ssr])");
    check((await page.getByRole("textbox", { name: "标题" }).inputValue()) === "", "标题应为空");
    check((await page.getByLabel(/^Slug/).inputValue()) === "", "slug 应为空");
    check((await page.getByLabel("摘要").inputValue()) === "", "摘要应为空");
    check((await page.getByRole("list", { name: "已添加的标签" }).getByRole("listitem").count()) === 0, "不应有标签块");
    check((await page.getByLabel("发布日期").inputValue()) === today(), "发布日期应默认今天");
    check(await page.getByRole("banner").getByText("草稿", { exact: true }).isVisible(), "徽标应为\"草稿\"");
  });

  await run("[SC-POSTINFO-03] TC-US03-19 打开已有文章显示最新保存的内容", async ({ page, api }) => {
    const title = `${PREFIX} 旧标题`;
    const id = await api.create({ title, body: "旧正文", tags: ["astro"], summary: "旧摘要" });
    await api.save(id, { title, body: "旧正文-v2", tags: ["astro"], summary: "旧摘要" });
    await openEditor(page, `/admin/posts/${id}`);
    check((await page.getByRole("textbox", { name: "标题" }).inputValue()) === title, "标题不符");
    check((await page.getByRole("textbox", { name: "正文" }).inputValue()) === "旧正文-v2", "正文应为最新保存的内容");
    await page.getByRole("button", { name: "设置" }).click();
    check((await page.getByLabel("摘要").inputValue()) === "旧摘要", "摘要不符");
    check((await page.getByRole("list", { name: "已添加的标签" }).textContent()).includes("astro"), "缺少标签 astro");
  });

  await run("[SC-POSTINFO-04/05/06] TC-US03-20/21 slug 跟随标题，手动修改后锁定；中文标题提示填英文 slug", async ({ page }) => {
    await openEditor(page, "/admin/posts/new");
    const title = page.getByRole("textbox", { name: "标题" });
    const slug = page.getByLabel(/^Slug/);
    await title.fill("Hello Astro");
    check((await slug.inputValue()) === "hello-astro", "slug 应跟随标题");
    await slug.fill("my-post");
    await title.fill("New Title");
    check((await slug.inputValue()) === "my-post", "手动修改后 slug 不应再跟随");
    await openEditor(page, "/admin/posts/new");
    await page.getByRole("textbox", { name: "标题" }).fill("你好世界");
    check(await page.getByText("请填写英文 slug").isVisible(), "中文标题应提示\"请填写英文 slug\"");
  });

  await run("[SC-POSTINFO-09] TC-US03-24 摘要计数，超过 200 字不能再输入", async ({ page }) => {
    await openEditor(page, "/admin/posts/new");
    const summary = page.getByLabel("摘要");
    await summary.fill("字".repeat(199));
    check(await page.getByText("199 / 200").isVisible(), "计数应为 199 / 200");
    await summary.pressSequentially("字字");
    check((await summary.inputValue()).length === 200, "超过 200 字后不应再能输入");
  });

  await run("[SC-POSTINFO-10] TC-US03-25 标签回车添加、自动补全、删除", async ({ page, api }) => {
    const tag = `${PREFIX}tag`;
    await api.create({ title: `${PREFIX} 带标签`, tags: [tag] });
    await openEditor(page, "/admin/posts/new");
    const input = page.getByRole("combobox", { name: "标签" });
    await input.fill("cloudflare");
    await input.press("Enter");
    await input.fill(tag.slice(0, -2));
    await page.getByRole("option", { name: tag }).click();
    const chips = page.getByRole("list", { name: "已添加的标签" });
    check((await chips.textContent()).includes("cloudflare") && (await chips.textContent()).includes(tag), "回车与补全都应添加标签");
    await page.getByRole("button", { name: "删除标签 cloudflare" }).click();
    check(!(await chips.textContent()).includes("cloudflare"), "× 应删除标签");
  });

  await run("[SC-POSTINFO-11] TC-US03-26 不存在的文章显示 404 与\"返回文章列表\"", async ({ page }) => {
    const response = await page.goto(`${TARGET_URL}/admin/posts/nope`);
    check(response.status() === 404, `HTTP 状态应为 404，实际 ${response.status()}`);
    check(await page.getByText("文章不存在或已被删除").isVisible(), "缺少\"文章不存在或已被删除\"");
    await page.getByRole("link", { name: "返回文章列表" }).click();
    await page.waitForURL(/\/admin$/);
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n结果：${results.length - failed.length}/${results.length} 通过`);
  process.exit(failed.length > 0 ? 1 : 0);
})();
