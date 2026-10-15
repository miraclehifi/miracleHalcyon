import { expect, test, type Page } from "@playwright/test";

// 阅读排版（reader-post-detail.md"正文"，US-07）。数据：reader-fixture
const content = (page: Page) => page.locator("#article-content");
const style = (page: Page, selector: string, prop: string, pseudo?: string) =>
  content(page).locator(selector).first().evaluate((el, [p, ps]) => getComputedStyle(el, ps ?? null).getPropertyValue(p!), [prop, pseudo] as const);

// [TC-US07-06][SC-ARTICLE-04] 段首缩进与首字下沉
test("[TC-US07-06] 段首缩进与首字下沉", async ({ page }) => {
  await page.goto("/posts/hello");
  const fontSize = parseFloat(await style(page, ":scope > p:not([data-dropcap])", "font-size"));
  expect(parseFloat(await style(page, ":scope > p:not([data-dropcap])", "text-indent"))).toBeCloseTo(fontSize * 2, 0);
  for (const selector of ["li", "blockquote p", "table td", "pre"]) {
    expect(parseFloat(await style(page, selector, "text-indent")), selector).toBe(0);
  }
  await expect(content(page).locator(":scope > p[data-dropcap]")).toHaveCount(1);
  expect(await style(page, ":scope > p[data-dropcap]", "float", "::first-letter")).toBe("left");
  const dropSize = parseFloat(await style(page, ":scope > p[data-dropcap]", "font-size", "::first-letter"));
  expect(dropSize / fontSize).toBeCloseTo(2.4, 1);
});

// [TC-US07-07][SC-ARTICLE-05] 首段不是文字时不下沉
test("[TC-US07-07] 首段不是文字时不下沉", async ({ page }) => {
  await page.goto("/posts/first-post");
  await expect(content(page).locator("[data-dropcap]")).toHaveCount(0);
});

// [TC-US07-08][SC-ARTICLE-06] 引用署名右对齐，带装饰引号
test("[TC-US07-08] 引用署名", async ({ page }) => {
  await page.goto("/posts/hello");
  const footer = content(page).locator("blockquote > footer[data-attribution]");
  await expect(footer).toHaveText("— 鲁迅");
  await expect(footer).toHaveCSS("text-align", "end");
  expect(await content(page).locator("blockquote").evaluate((el) => getComputedStyle(el, "::before").content)).toContain("“");
});

// [TC-US07-03][SC-ARTICLE-02] 代码高亮随主题切换，无需刷新
test("[TC-US07-03] 代码高亮随主题切换", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/posts/hello");
  const pre = content(page).locator(".expressive-code pre").first();
  const before = await pre.evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await expect.poll(() => pre.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before);
});
