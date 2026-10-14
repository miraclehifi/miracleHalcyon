import { expect, test } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

const GFM = `# 标题
- [ ] 任务

| a | b |
|---|---|
| 1 | 2 |

> 引用

[Astro](https://astro.build)

\`\`\`ts
const answer: number = 42;
\`\`\`
`;

// [TC-US04-09][SC-PREVIEW-01][SC-PREVIEW-02] 输入 GFM 停止后 300ms 内预览显示渲染结果，代码块有高亮；预览区不含 script
// @timing：在 *-timing 项目中单独运行（playwright.config.ts）
test("[TC-US04-09] 输入 GFM 后预览 300ms 内更新且代码块高亮", { tag: "@timing" }, async ({ page, baseURL }, testInfo) => {
  const run = `${Date.now().toString(36)}${testInfo.project.name[0]}`;
  await login(page);
  const id = await adminApi(page, baseURL!).create({ title: `预览 ${run}` });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);

  const body = page.getByRole("textbox", { name: "正文" });
  const preview = page.getByTestId("md-preview");
  // 预热：首次渲染含 Worker 冷启动，不计入 300ms
  await body.fill("```ts\nlet warm = 1;\n```");
  await expect(preview.locator(".expressive-code")).toHaveCount(1);

  await body.fill(GFM);
  await expect(preview.getByRole("heading", { level: 1, name: "标题", exact: true })).toBeVisible({ timeout: 300 });
  await expect(preview.getByRole("checkbox")).toHaveCount(1);
  await expect(preview.getByRole("table")).toBeVisible();
  await expect(preview.locator("blockquote")).toHaveText("引用");
  await expect(preview.getByRole("link", { name: "Astro" })).toHaveAttribute("href", "https://astro.build");
  await expect(preview.locator(".expressive-code pre span[style]").first()).toBeVisible(); // Shiki 着色
  await expect(preview.locator("script, style")).toHaveCount(0);
});
