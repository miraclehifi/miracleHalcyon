import { expect, test } from "@playwright/test";
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
