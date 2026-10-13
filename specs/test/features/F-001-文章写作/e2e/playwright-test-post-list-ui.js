// F-001 US-07 文章列表 UI 交互验收：TC-US07-12、13、14、20（acceptance/post-management/US-07-tests.md）
// 由 implement（build-post-list-page）生成，verify 阶段执行：bash playwright-test-post-list-ui.sh
// 前置：服务已用 CLOUDFLARE_ENV=e2e 构建并运行（测试账号见 wrangler.jsonc env.e2e），本地 D1 已迁移
// 数据：经接口创建，标题带本次运行的唯一前缀，只断言这几篇（本地 D1 可能已有其他文章）
const { chromium } = require("playwright");

const TARGET_URL = /^https?:\/\//.test(process.env.PLAYWRIGHT_ENV ?? "") ? process.env.PLAYWRIGHT_ENV : "http://localhost:4321";
const USERNAME = "test-admin";
const PASSWORD = "Test-Passw0rd!";
const PREFIX = `U${Date.now().toString(36)}`;

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
  const draft = (title, slug = "", body = "") => ({ title, slug, tags: [], summary: "", body, publishedAt: null });
  return {
    create: async (title, slug, body) => (await (await page.request.post(`${TARGET_URL}/api/admin/posts`, { headers, data: draft(title, slug, body) })).json()).id,
    save: (id, title, slug, body) => page.request.put(`${TARGET_URL}/api/admin/posts/${id}`, { headers, data: draft(title, slug, body) }),
    publish: (id) => page.request.post(`${TARGET_URL}/api/admin/posts/${id}/publish`, { headers }),
  };
}

async function run(title, body) {
  const browser = await chromium.launch({ headless: process.env.HEADLESS === "1", slowMo: 50 });
  const page = await (await browser.newContext()).newPage();
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

const rowsOf = (page, prefix) => page.getByRole("listitem").filter({ hasText: prefix });

(async () => {
  console.log(`被测站点：${TARGET_URL}`);

  await run("[SC-POSTLIST-01] TC-US07-12 三种状态徽标与行字段（标题、状态、更新时间，不显示标签）", async ({ page, api }) => {
    const p = `${PREFIX}-12`;
    const c = await api.create(`${p} 已发布 C`, `${p}-c`.toLowerCase(), "C1");
    await api.publish(c);
    await api.save(c, `${p} 已发布 C`, `${p}-c`.toLowerCase(), "C2");
    const b = await api.create(`${p} 已发布 B`, `${p}-b`.toLowerCase(), "B1");
    await api.publish(b);
    await api.create(`${p} 草稿 A`);
    await page.goto(`${TARGET_URL}/admin`);
    const rows = rowsOf(page, p);
    await rows.first().waitFor();
    const texts = await rows.allTextContents();
    const expected = [[`${p} 草稿 A`, "草稿"], [`${p} 已发布 B`, "已发布"], [`${p} 已发布 C`, "已发布 · 有未发布修改"]];
    check(texts.length === 3, `应有 3 行，实际 ${texts.length}`);
    expected.forEach(([titleText, badge], i) => {
      check(texts[i].startsWith(titleText + badge), `第 ${i + 1} 行应为"${titleText}"+"${badge}"，实际"${texts[i]}"`);
      check(/更新于 /.test(texts[i]), `第 ${i + 1} 行缺少更新时间`);
    });
  });

  await run("[SC-POSTLIST-02] TC-US07-13 点击标题进入 /admin/posts/{id}", async ({ page, api }) => {
    const p = `${PREFIX}-13`;
    const id = await api.create(`${p} 草稿 A`);
    await page.goto(`${TARGET_URL}/admin`);
    await page.getByRole("link", { name: `${p} 草稿 A` }).click();
    await page.waitForURL(new RegExp(`/admin/posts/${id}$`));
  });

  await run("[SC-POSTLIST-03] TC-US07-14 点击\"新建文章\"进入 /admin/posts/new，不新增文章", async ({ page }) => {
    const totalOf = async () => Number((await page.getByText(/^共 \d+ 篇$/).textContent()).match(/\d+/)[0]);
    const before = await totalOf();
    await page.getByRole("button", { name: "新建文章" }).click();
    await page.waitForURL(/\/admin\/posts\/new$/);
    await page.goto(`${TARGET_URL}/admin`);
    check((await totalOf()) === before, `进入新建页后文章总数从 ${before} 变为 ${await totalOf()}`);
  });

  // 首屏数据由 SSR 读取，浏览器无法拦截；改为拦截首屏之后的列表请求（切换"草稿"筛选，add-post-list-status-filter 接入后可用）
  await run("[SC-POSTLIST-09] TC-US07-20 列表请求失败（500 / 网络中断）显示\"加载失败\"，重试后恢复", async ({ page }) => {
    for (const fail of [(route) => route.fulfill({ status: 500 }), (route) => route.abort()]) {
      await page.goto(`${TARGET_URL}/admin`);
      await page.waitForSelector("astro-island:not([ssr])");
      await page.route("**/api/admin/posts*", fail, { times: 1 });
      await page.getByRole("radio", { name: /草稿/ }).click();
      await page.getByText("加载失败").waitFor();
      check((await page.getByText("还没有文章").count()) === 0, "加载失败时不应显示空状态");
      await page.getByRole("button", { name: "重试" }).click();
      await page.getByText("加载失败").waitFor({ state: "hidden" });
      check((await page.getByRole("listitem").count()) > 0, "重试后列表应恢复");
    }
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n结果：${results.length - failed.length}/${results.length} 通过`);
  process.exit(failed.length > 0 ? 1 : 0);
})();
