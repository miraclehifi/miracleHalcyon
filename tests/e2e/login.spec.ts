import { expect, test, type Page } from "@playwright/test";
import { PASSWORD, USERNAME } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// [TC-US01-02][SC-LOGIN-01] 浏览器中正确凭据登录进入 /admin（测试账号见 wrangler.jsonc env.e2e）

test("[TC-US01-02] 正确凭据登录后进入 /admin 并获得 HttpOnly 会话 Cookie", async ({ page, baseURL }) => {
  await page.goto("/admin/login");
  await waitForHydration(page);
  await page.getByLabel("账号").fill(USERNAME);
  await page.getByLabel("密码").fill(PASSWORD);
  const loginResponse = page.waitForResponse((r) => r.url().endsWith("/api/admin/login"));
  await page.getByRole("button", { name: "登录" }).click();
  const setCookie = (await (await loginResponse).headerValue("set-cookie")) ?? "";

  await expect(page).toHaveURL(/\/admin$/);
  const cookie = (await page.context().cookies()).find((c) => c.name === "mh_session");
  // Cookie 属性以响应头为准（Windows 版 WebKit 不支持 SameSite，cookies() 里恒为 None）；
  // 契约：本地 http 环境去掉 Secure，https 环境必须带 Secure
  expect({
    stored: cookie?.httpOnly,
    httpOnly: /;\s*HttpOnly/i.test(setCookie),
    sameSite: /;\s*SameSite=Lax/i.test(setCookie),
    secure: /;\s*Secure/i.test(setCookie),
  }).toEqual({ stored: true, httpOnly: true, sameSite: true, secure: baseURL?.startsWith("https:") ?? false });
});

const submit = (page: Page) => page.locator("form").getByRole("button");

async function openLogin(page: Page) {
  await page.goto("/admin/login");
  await waitForHydration(page);
  await page.getByLabel("账号").fill(USERNAME);
}

// [TC-US01-31][SC-LOGIN-10] 提交中按钮禁用并显示"登录中…"；返回前连点 3 次、按 Enter 1 次，登录请求只发 1 次
test("[TC-US01-31] 提交中按钮禁用，连击只发一次请求", async ({ page }) => {
  await openLogin(page);
  await page.getByLabel("密码").fill(PASSWORD);
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/api/admin/login")) requests++;
  });
  await page.route("**/api/admin/login", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });

  await submit(page).click();
  await expect(submit(page)).toBeDisabled();
  await expect(submit(page)).toHaveText("登录中…");
  await expect(submit(page)).toHaveAttribute("aria-busy", "true");
  // 按钮已禁用，locator.click 会一直等它可用：用鼠标在原位置真实点击
  const box = (await submit(page).boundingBox())!;
  for (let i = 0; i < 3; i++) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.getByLabel("密码").press("Enter");

  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
  expect(requests).toBe(1);
});

test.describe("登录失败", () => {
  // 独立的来源 IP（服务端按 CF-Connecting-IP 限流），不占用其他用例的失败计数；结尾正确登录一次清零
  test.use({ extraHTTPHeaders: { "CF-Connecting-IP": "198.51.100.31" } });

  // [TC-US01-33][SC-LOGIN-04] 错误提示文案；密码清空、账号保留；停留登录页且无会话；按钮回到禁用
  test("[TC-US01-33] 密码错误：提示、清空密码、保留账号", async ({ page }) => {
    await openLogin(page);
    await page.getByLabel("密码").fill("Wrong-Passw0rd!");
    await submit(page).click();

    await expect(page.getByRole("alert")).toHaveText("账号或密码错误，请检查后重试"); // 以 admin-login.md 与 auth api-contract 为准
    await expect(page.getByLabel("密码")).toHaveValue("");
    await expect(page.getByLabel("账号")).toHaveValue(USERNAME);
    await expect(submit(page)).toBeDisabled();
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect((await page.context().cookies()).some((c) => c.name === "mh_session")).toBe(false);

    await page.getByLabel("密码").fill(PASSWORD);
    await submit(page).click();
    await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 });
  });
});
