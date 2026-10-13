// F-001 US-01 登录页 UI 交互验收：TC-US01-29 ～ 34（acceptance/admin-auth/US-01-tests.md）
// 由 implement（build-login-page）生成，verify 阶段执行：bash playwright-test-login-ui.sh
// 前置：服务已用 CLOUDFLARE_ENV=e2e 构建并运行（测试账号见 wrangler.jsonc env.e2e），本地 D1 已迁移
const { chromium } = require("playwright");

// PLAYWRIGHT_ENV 为被测站点 base URL（与 playwright.config.ts 一致）；未设置时用本地 preview
const TARGET_URL = /^https?:\/\//.test(process.env.PLAYWRIGHT_ENV ?? "") ? process.env.PLAYWRIGHT_ENV : "http://localhost:4321";
const LOGIN_URL = `${TARGET_URL}/admin/login`;
const USERNAME = "test-admin";
const PASSWORD = "Test-Passw0rd!";
const LOGIN_API = "**/api/admin/login";

const results = [];

function check(condition, message) {
  if (!condition) throw new Error(message);
}

async function run(title, body) {
  const browser = await chromium.launch({ headless: process.env.HEADLESS === "1", slowMo: 50 });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(LOGIN_URL);
    await page.waitForSelector("astro-island:not([ssr])"); // 等待 React 水合
    await body({ page, context, button: page.getByRole("button", { name: /登录/ }) });
    results.push({ title, ok: true });
    console.log(`✅ ${title}`);
  } catch (error) {
    results.push({ title, ok: false, error: error.message });
    console.log(`❌ ${title}\n   ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function sessionCookie(context) {
  return (await context.cookies()).find((cookie) => cookie.name === "mh_session");
}

(async () => {
  console.log(`被测站点：${TARGET_URL}`);

  await run("[SC-LOGIN-05] TC-US01-29 账号或密码为空时登录按钮禁用，Enter 不发请求", async ({ page, button }) => {
    const table = [
      ["", "", true],
      [USERNAME, "", true],
      ["", PASSWORD, true],
      [USERNAME, PASSWORD, false],
    ];
    let requests = 0;
    page.on("request", (request) => request.url().endsWith("/api/admin/login") && requests++);
    for (const [username, password, disabled] of table) {
      await page.getByLabel("账号").fill(username);
      await page.getByLabel("密码").fill(password);
      check((await button.isDisabled()) === disabled, `账号="${username}" 密码="${password ? "***" : ""}" 时按钮禁用应为 ${disabled}`);
      if (disabled) await page.getByLabel("密码").press("Enter");
    }
    await page.waitForTimeout(500);
    check(requests === 0, `禁用状态下按 Enter 发出了 ${requests} 次登录请求`);
  });

  await run("[SC-LOGIN-05] TC-US01-30 填写后启用，清空任一字段后再次禁用", async ({ page, button }) => {
    await page.getByLabel("账号").fill(USERNAME);
    await page.getByLabel("密码").fill(PASSWORD);
    check(await button.isEnabled(), "填写账号和密码后按钮应可用");
    await page.getByLabel("密码").fill("");
    check(await button.isDisabled(), "清空密码后按钮应禁用");
    await page.getByLabel("密码").fill(PASSWORD);
    await page.getByLabel("账号").fill("");
    check(await button.isDisabled(), "清空账号后按钮应禁用");
  });

  await run("[SC-LOGIN-04] TC-US01-33 凭据错误：提示文案，密码清空、账号保留", async ({ page, context, button }) => {
    await page.getByLabel("账号").fill(USERNAME);
    await page.getByLabel("密码").fill("Wrong-Passw0rd!");
    await button.click();
    await page.getByRole("alert").waitFor();
    check((await page.getByRole("alert").textContent()) === "账号或密码错误，请检查后重试", "错误提示文案不符");
    check((await page.getByLabel("密码").inputValue()) === "", "密码框应被清空");
    check((await page.getByLabel("账号").inputValue()) === USERNAME, "账号应保留");
    check(new URL(page.url()).pathname === "/admin/login", "应停留在登录页");
    check(!(await sessionCookie(context)), "不应设置会话 Cookie");
    check(await button.isDisabled(), "密码清空后按钮应回到禁用");
    check(await page.evaluate(() => document.activeElement?.getAttribute("name") === "password"), "焦点应回到密码框");
  });

  await run("[SC-LOGIN-06] TC-US01-34 锁定时显示限流提示（模拟 429，避免真实锁定本机 IP）", async ({ page, context, button }) => {
    await page.route(LOGIN_API, (route) =>
      route.fulfill({
        status: 429,
        headers: { "Retry-After": "900" },
        contentType: "application/json",
        body: JSON.stringify({ error: { code: "RATE_LIMITED", message: "尝试次数过多，请 15 分钟后再试" } }),
      }),
    );
    await page.getByLabel("账号").fill(USERNAME);
    await page.getByLabel("密码").fill(PASSWORD);
    await button.click();
    await page.getByRole("alert").waitFor();
    check((await page.getByRole("alert").textContent()) === "尝试次数过多，请 15 分钟后再试", "限流提示文案不符");
    check(new URL(page.url()).pathname === "/admin/login", "应停留在登录页");
    check(!(await sessionCookie(context)), "不应设置会话 Cookie");
  });

  for (const [label, handler] of [
    ["网络中断", (route) => route.abort()],
    ["服务端 500", (route) => route.fulfill({ status: 500, contentType: "application/json", body: '{"error":{"code":"INTERNAL","message":"服务器错误"}}' })],
  ]) {
    await run(`[SC-LOGIN-10] TC-US01-32 ${label}后加载态结束、按钮恢复`, async ({ page, context, button }) => {
      await page.route(LOGIN_API, handler);
      await page.getByLabel("账号").fill(USERNAME);
      await page.getByLabel("密码").fill(PASSWORD);
      await button.click();
      await page.getByRole("alert").waitFor();
      check(await button.isEnabled(), "失败后按钮应恢复可用");
      check((await button.getAttribute("aria-busy")) !== "true", "失败后不应仍为加载态");
      check(new URL(page.url()).pathname === "/admin/login", "不应跳转");
      check(!(await sessionCookie(context)), "不应设置会话 Cookie");
    });
  }

  // 放在最后：真实登录成功，同时清零前面 TC-US01-33 产生的失败计数
  await run("[SC-LOGIN-10] TC-US01-31 提交中按钮禁用 + aria-busy，连击仅发一次请求", async ({ page, button }) => {
    let requests = 0;
    await page.route(LOGIN_API, async (route) => {
      requests++;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });
    await page.getByLabel("账号").fill(USERNAME);
    await page.getByLabel("密码").fill(PASSWORD);
    await button.click();
    check(await button.isDisabled(), "提交后按钮应立即禁用");
    check((await button.getAttribute("aria-busy")) === "true", "提交中按钮应为 aria-busy=true");
    check((await button.textContent())?.includes("登录中…"), "提交中按钮应显示“登录中…”");
    for (let i = 0; i < 3; i++) await button.click({ force: true }).catch(() => {});
    await page.getByLabel("密码").press("Enter");
    await page.waitForURL(/\/admin$/);
    check(requests === 1, `登录请求应只发 1 次，实际 ${requests} 次`);
  });

  const failed = results.filter((result) => !result.ok);
  console.log(`\n共 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length}`);
  process.exit(failed.length > 0 ? 1 : 0);
})();
