import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";

// [TC-US07-16][SC-POSTLIST-05] 标题搜索：停止输入 300ms 后筛选（连续输入只发 1 次请求），不区分大小写，同步到 ?q=
test("[TC-US07-16] 输入关键字后只显示标题包含关键字的文章", async ({ page, baseURL }, testInfo) => {
  const token = `s${Date.now().toString(36)}${testInfo.project.name[0]}`;
  const api = adminApi(page, baseURL!);
  await login(page);
  for (const title of [`${token}astro 一`, `${token}ASTRO 二`, `${token}react`, `${token}vue`, `${token}css`]) await api.create({ title });

  await page.goto("/admin");
  await page.waitForSelector("astro-island:not([ssr])");
  let requests = 0;
  page.on("request", (request) => new URL(request.url()).pathname === "/api/admin/posts" && requests++);
  await page.getByRole("searchbox", { name: "搜索标题" }).pressSequentially(`${token}Astro`, { delay: 40 });

  await expect(page).toHaveURL(new RegExp(`/admin[?]q=${token}Astro$`));
  await expect(page.getByRole("listitem")).toHaveCount(2);
  await expect(page.getByRole("listitem").nth(0)).toContainText(`${token}ASTRO 二`);
  await expect(page.getByRole("listitem").nth(1)).toContainText(`${token}astro 一`);
  expect(requests).toBe(1);

  await page.reload();
  await expect(page.getByRole("searchbox", { name: "搜索标题" })).toHaveValue(`${token}Astro`);
  await expect(page.getByRole("listitem")).toHaveCount(2);
});
