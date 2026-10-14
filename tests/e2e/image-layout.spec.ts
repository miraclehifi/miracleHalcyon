import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// US-12 预览中的单图（ArticleImage）：宽图、图注、容错、继续输入不重新加载。图片为 R2 只读夹具（npm run e2e:seed）
const IMG = (n: number) =>
  [
    "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg",
    "/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg",
    "/img/2026/10/cccccccccc_800x1200_445566.jpg",
  ][n - 1];

const preview = (page: Page) => page.getByTestId("md-preview");
const editor = (page: Page) => page.getByRole("textbox", { name: "正文" });
// 挂载后的 ArticleImage：图片外层是 RefineFrame（带 data-status）
const mounted = (page: Page) => preview(page).locator("figure[data-article-image]:has([data-status])");

async function openDraft(page: Page, baseURL: string, body: string, title: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `[E2E-US12] ${title} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, body });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
}

// [TC-US12-01][SC-LAYOUT-01] #wide 向两侧扩出；加载前后容器高度不变，宽高比 1600:900
test("[TC-US12-01] 宽图向两侧扩出并按宽高比预留空间", async ({ page, baseURL }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(`**${IMG(1)}*`, async (route) => {
    await gate;
    await route.continue();
  });
  await openDraft(page, baseURL!, `![山](${IMG(1)}#wide)\n\n段落`, "宽图");

  const wide = mounted(page).and(preview(page).locator("[data-wide]"));
  await expect(wide).toHaveCount(1, { timeout: 15_000 });
  await expect(wide).toHaveAttribute("data-loading", "");
  const frame = wide.locator("[data-status]");
  const before = (await frame.boundingBox())!;
  const paragraph = (await preview(page).locator(".prose p", { hasText: "段落" }).boundingBox())!;
  release();
  await expect(wide).not.toHaveAttribute("data-loading");
  const after = (await frame.boundingBox())!;

  expect(before.width).toBeGreaterThan(paragraph.width);
  expect(before.x).toBeLessThan(paragraph.x);
  expect(Math.abs(before.height - (before.width * 900) / 1600)).toBeLessThanOrEqual(1);
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
});

// [TC-US12-06][SC-LAYOUT-06] title 为图注、无 title 不显示、alt 保留
// [TC-US12-07][SC-LAYOUT-10] 外链 / 文件名不合命名 / 大写标记按普通图（不预留比例）；#wide,foo 认出 wide；无未捕获错误
test("[TC-US12-06][TC-US12-07] 图注与容错", async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const png = readFileSync("tests/fixtures/images/aaaaaaaaaa_1600x900_556677.jpg");
  await page.route("https://example.com/**", (route) => route.fulfill({ body: png, contentType: "image/jpeg" }));
  const body = [
    `![一只猫](${IMG(2)} "窗台上的猫")`,
    `![无图注](${IMG(3)})`,
    "![a](https://example.com/a.png#foo)",
    "![b](/img/2026/10/bad-name.jpg)",
    `![c](${IMG(1)}#WIDE)`,
    `![d](${IMG(1)}#wide,foo)`,
    "结尾段落",
  ].join("\n\n");
  await openDraft(page, baseURL!, body, "图注");

  await expect(mounted(page)).toHaveCount(6, { timeout: 15_000 });
  const figures = await mounted(page).evaluateAll((list) =>
    list.map((figure) => ({
      alt: figure.querySelector("img")!.getAttribute("alt"),
      caption: figure.querySelector("figcaption")?.textContent ?? null,
      wide: figure.hasAttribute("data-wide"),
      aspect: (figure.querySelector("[data-status]") as HTMLElement).style.getPropertyValue("--rf-aspect"),
    })),
  );

  expect(figures).toEqual([
    { alt: "一只猫", caption: "窗台上的猫", wide: false, aspect: "1200 / 800" },
    { alt: "无图注", caption: null, wide: false, aspect: "800 / 1200" },
    { alt: "a", caption: null, wide: false, aspect: "" },
    { alt: "b", caption: null, wide: false, aspect: "" },
    { alt: "c", caption: null, wide: false, aspect: "1600 / 900" },
    { alt: "d", caption: null, wide: true, aspect: "1600 / 900" },
  ]);
  await expect(preview(page).getByText("结尾段落")).toBeVisible();
  expect(errors).toEqual([]);
});

// [TC-US12-17][SC-LAYOUT-13] 继续输入时已加载的图片复用原 DOM：不重新请求、不回到加载中（组图部分随 add-image-gallery-display 补充）
test("[TC-US12-17] 继续输入时已加载的图片不重新加载", async ({ page, baseURL }) => {
  await openDraft(page, baseURL!, `![山](${IMG(1)})\n\n![猫](${IMG(2)} "猫")\n\n一段文字`, "复用");
  await expect(mounted(page)).toHaveCount(2, { timeout: 15_000 });
  await expect(mounted(page).locator("[data-status=complete]")).toHaveCount(2);
  await mounted(page).evaluateAll((list) => list.forEach((figure) => figure.setAttribute("data-testmark", "1")));
  let imageRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/img/")) imageRequests++;
  });

  await editor(page).click();
  await editor(page).press("ControlOrMeta+End");
  await editor(page).pressSequentially("一二三四五六七八九十一二三四五六七八九十");
  await expect(preview(page).getByText("一段文字一二三四五六七八九十一二三四五六七八九十")).toBeVisible();

  await expect(preview(page).locator("figure[data-article-image][data-testmark]")).toHaveCount(2);
  await expect(preview(page).locator("[data-article-image][data-loading]")).toHaveCount(0);
  await expect(mounted(page).locator("[data-status=complete]")).toHaveCount(2);
  expect(imageRequests).toBe(0);
});
