import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";

// US-12 预览中的单图（ArticleImage）与组图（ImageGallery）：宽图、图注、网格 / 手风琴、容错、继续输入不重新加载。
// 图片为 R2 只读夹具（npm run e2e:seed）
const FIXTURES = [
  "aaaaaaaaaa_1600x900_556677",
  "bbbbbbbbbb_1200x800_112233",
  "cccccccccc_800x1200_445566",
  "dddddddddd_1000x1000_778899",
  "eeeeeeeeee_1400x1050_8a7b6c",
  "ffffffffff_900x1600_3d6a2c",
  "gggggggggg_1920x1080_a8382c",
  "hhhhhhhhhh_1080x1350_e8a15a",
  "iiiiiiiiii_2000x1000_262626",
];
const IMG = (n: number) => `/img/2026/10/${FIXTURES[(n - 1) % FIXTURES.length]}.jpg`;
// n 张图片各占一行（同一段落）；mark 加在首张
const lines = (from: number, n: number, mark = "") =>
  Array.from({ length: n }, (_, i) => `![图${from + i}](${IMG(from + i)}${i === 0 ? mark : ""})`).join("\n");

const preview = (page: Page) => page.getByTestId("md-preview");
const editor = (page: Page) => page.getByRole("textbox", { name: "正文" });
// 挂载后的 ArticleImage：图片外层是 RefineFrame（带 data-status）
const mounted = (page: Page) => preview(page).locator("figure[data-article-image]:has([data-status])");
const galleries = (page: Page) => preview(page).locator("figure[data-image-gallery]");

// 组图的模式、张数与网格列数（按渲染出的列宽数）
async function galleryLayout(page: Page) {
  return galleries(page).evaluateAll((list) =>
    list.map((figure) => {
      const variant = (figure as HTMLElement).dataset.imageGallery;
      if (variant === "accordion") return { variant, count: figure.querySelectorAll("[role=listitem]").length };
      const grid = figure.querySelector<HTMLElement>(":scope > div > .grid")!;
      return { variant, count: figure.querySelectorAll("[data-gallery-item]").length, columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length };
    }),
  );
}

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

// [TC-US12-02][SC-LAYOUT-02] 2 / 3 / 9 张的段落为网格，列数 2 / 3 / 3；每个单元格带加载框与主色
test("[TC-US12-02] 只含多张图片的段落显示为组图网格", async ({ page, baseURL }) => {
  await openDraft(page, baseURL!, [lines(1, 2), lines(3, 3), lines(1, 9)].join("\n\n"), "网格");

  await expect(galleries(page)).toHaveCount(3, { timeout: 15_000 });
  expect(await galleryLayout(page)).toEqual([
    { variant: "grid", count: 2, columns: 2 },
    { variant: "grid", count: 3, columns: 3 },
    { variant: "grid", count: 9, columns: 3 },
  ]);
  const first = galleries(page).first().locator("[data-gallery-item]");
  expect(await first.evaluateAll((cells) => cells.map((cell) => [(cell as HTMLElement).dataset.accent, cell.querySelector("[data-status]") !== null]))).toEqual([
    ["#556677", true],
    ["#112233", true],
  ]);
  await expect(mounted(page)).toHaveCount(0);
});

// [TC-US12-03][SC-LAYOUT-03] 首张 #accordion 且 3 / 7 张为手风琴，默认展开中间一张
test("[TC-US12-03] 首张带 #accordion 且 3–7 张显示为手风琴", async ({ page, baseURL }) => {
  await openDraft(page, baseURL!, [lines(1, 3, "#accordion"), lines(2, 7, "#accordion")].join("\n\n"), "手风琴");

  await expect(galleries(page)).toHaveCount(2, { timeout: 15_000 });
  expect(await galleryLayout(page)).toEqual([
    { variant: "accordion", count: 3 },
    { variant: "accordion", count: 7 },
  ]);
  const current = await galleries(page).evaluateAll((list) =>
    list.map((figure) => [...figure.querySelectorAll("[role=listitem]")].findIndex((item) => item.getAttribute("aria-current") === "true")),
  );
  expect(current).toEqual([1, 3]);
  const panels = galleries(page).first().getByRole("listitem");
  await expect.poll(async () => ((await panels.nth(1).boundingBox())?.width ?? 0) > ((await panels.nth(0).boundingBox())?.width ?? 0) * 1.5).toBe(true);
});

// [TC-US12-04][SC-LAYOUT-04] 手风琴 2 / 8 张退回网格；10 张为 9 张网格 + 1 张单图；无报错
// [TC-US12-05][SC-LAYOUT-05] 图文同段、空行分隔不成组；同一行两张只含图片则成组
test("[TC-US12-04][TC-US12-05] 退回网格、折行与不成组的情况", async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const body = [
    lines(1, 2, "#accordion"),
    lines(1, 8, "#accordion"),
    lines(1, 10),
    `见下图\n${lines(1, 2)}`,
    `![单3](${IMG(3)})`,
    `![单4](${IMG(4)})`,
    `![同行5](${IMG(5)}) ![同行6](${IMG(6)})`,
  ].join("\n\n");
  await openDraft(page, baseURL!, body, "边界");

  await expect(galleries(page)).toHaveCount(4, { timeout: 15_000 });
  expect(await galleryLayout(page)).toEqual([
    { variant: "grid", count: 2, columns: 2 },
    { variant: "grid", count: 8, columns: 3 },
    { variant: "grid", count: 9, columns: 3 },
    { variant: "grid", count: 2, columns: 2 },
  ]);
  // 单图：10 张剩下的 1 张、"见下图"后的 2 张、空行分隔的 2 张
  expect(await mounted(page).evaluateAll((list) => list.map((figure) => figure.querySelector("img")!.alt))).toEqual(["图10", "图1", "图2", "单3", "单4"]);
  await expect(preview(page).getByText("见下图")).toBeVisible();
  expect(errors).toEqual([]);
});

// [TC-US12-17][SC-LAYOUT-13] 组图部分：继续输入时组图复用原 DOM，单元格不重新请求、不回到加载中
test("[TC-US12-17] 继续输入时已加载的组图不重新加载", async ({ page, baseURL }) => {
  await openDraft(page, baseURL!, `${lines(1, 3)}\n\n${lines(4, 3, "#accordion")}\n\n一段文字`, "组图复用");
  await expect(galleries(page)).toHaveCount(2, { timeout: 15_000 });
  await expect(galleries(page).first().locator("[data-status=complete]")).toHaveCount(3);
  await galleries(page).evaluateAll((list) => list.forEach((figure) => figure.setAttribute("data-testmark", "1")));
  let imageRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/img/")) imageRequests++;
  });

  await editor(page).click();
  await editor(page).press("ControlOrMeta+End");
  await editor(page).pressSequentially("一二三四五六七八九十");
  await expect(preview(page).getByText("一段文字一二三四五六七八九十")).toBeVisible();

  await expect(preview(page).locator("figure[data-image-gallery][data-testmark]")).toHaveCount(2);
  await expect(galleries(page).first().locator("[data-status=complete]")).toHaveCount(3);
  expect(imageRequests).toBe(0);
});
