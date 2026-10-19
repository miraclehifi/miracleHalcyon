import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { dropFiles, holdUploads, type FakeFile } from "./support/images";

// 上传进度卡片（admin-post-editor"上传进度卡片"，media-upload-experience 模块 1）
async function openPost(page: Page, baseURL: string, label: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `[E2E-卡片] ${label}${Date.now().toString(36)}`, body: "" });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  return page.getByRole("textbox", { name: "正文" });
}

interface Sample {
  states: string[];
  progress: (number | null)[];
  stages: string[];
  leaving: boolean[]; // 已完成、正在淡出
}

// 在页面里每 50ms 采样一次所有卡片的状态、进度与阶段文案（不依赖测试进程与页面之间的往返时延）
async function startSampling(page: Page) {
  await page.evaluate(() => {
    const samples: Sample[] = [];
    Object.assign(window, { __samples: samples });
    setInterval(() => {
      const cards = [...document.querySelectorAll<HTMLElement>('[data-testid="upload-card"]')];
      samples.push({
        states: cards.map((card) => card.dataset.state ?? ""),
        progress: cards.map((card) => {
          const value = card.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow");
          return value === null || value === undefined ? null : Number(value);
        }),
        stages: cards.map((card) => card.querySelector("[aria-live]")?.textContent ?? ""),
        leaving: cards.map((card) => card.classList.contains("opacity-0")),
      });
    }, 50);
  });
  return () => page.evaluate(() => (window as unknown as { __samples: Sample[] }).__samples);
}

const LARGE_PHOTO: FakeFile = { name: "large-photo.jpg", type: "image/jpeg", content: { photo: [4000, 3000] }, padTo: 6_000_000 };
const png = (name: string, color: [number, number]): FakeFile => ({ name, type: "image/png", content: { png: color } });

// [TC-US05-36][SC-IMAGE-01][SC-IMAGE-12] 拖入后立即出现卡片（缩略图为 blob、半透明模糊），阶段依次压缩 → 上传 N%，
// 进度只增不减、压缩阶段 ≤ 15，最终 100；完成后卡片消失、换成正式图片。
// 上传请求先扣住（本地上传太快，卡片来不及渲染）；上传阶段按字节的中间进度由单元测试 UT-157 / UT-158 覆盖
test("[TC-US05-36] 进度卡片：缩略图、阶段、进度递增、成功后消失", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const editor = await openPost(page, baseURL!, "进度");
  const release = await holdUploads(page);
  const samples = await startSampling(page);
  await dropFiles(page, editor, [LARGE_PHOTO]);

  const preview = page.getByTestId("md-preview");
  const card = preview.getByTestId("upload-card");
  await expect(card).toBeVisible();
  await expect(card.locator("img")).toHaveAttribute("src", /^blob:/);
  expect(await card.locator("img").evaluate((img) => getComputedStyle(img).opacity)).toBe("0.5");
  await expect(card).toContainText(/正在上传… \d+%/, { timeout: 30_000 });
  release();
  await expect(card).toHaveCount(0, { timeout: 90_000 });
  await expect(editor).toHaveValue(/^!\[large-photo\]\(\/img\/.+\)$/);
  await expect(preview.locator('img[src^="/img/"]')).toBeVisible();

  const series = (await samples()).filter((s) => s.states.length === 1);
  const values = series.filter((s) => s.progress[0] !== null).map((s) => s.progress[0]!);
  const stages = [...new Set(series.map((s) => s.stages[0]))];
  expect(values.every((v, i) => i === 0 || v >= values[i - 1])).toBe(true);
  expect(["正在压缩…,正在上传…", "正在上传…"]).toContain(stages.join(",")); // 预览渲染出卡片时压缩可能已经结束
  expect(series.filter((s) => s.states[0] === "compressing").every((s) => s.progress[0]! <= 15)).toBe(true);
  expect(Math.max(...values)).toBe(100);
});

// [TC-US05-28][SC-IMAGE-12] 三张同时上传：按 a、b、c 顺序出现三张卡片；同时上传的不超过 2 张，c 先显示"等待中…"；
// b 先完成时只有 b 换成图片，a 仍在上传；最后源码按 a、b、c 顺序
test("[TC-US05-28] 三张同时上传：各自卡片、并发 2、互不影响", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "并发");
  const gates = new Map<string, () => void>();
  const held = new Map(["a.png", "b.png", "c.png"].map((name) => [name, new Promise<void>((resolve) => gates.set(name, resolve))]));
  const requested: string[] = [];
  await page.route("**/api/admin/images", async (route) => {
    const name = /filename="([^"]+)"/.exec(route.request().postDataBuffer()?.toString("latin1") ?? "")?.[1] ?? "";
    requested.push(name);
    await held.get(name);
    await route.continue();
  });
  const samples = await startSampling(page);
  await dropFiles(page, editor, [png("a.png", [40, 30]), png("b.png", [30, 40]), png("c.png", [20, 20])]);

  const cards = page.getByTestId("md-preview").getByTestId("upload-card");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toHaveAccessibleName("a.png");
  await expect(cards.nth(2)).toHaveAccessibleName("c.png");
  await expect(cards.nth(2)).toHaveAttribute("data-state", "waiting");
  await expect(cards.nth(2)).toContainText("等待中…");
  expect(requested.sort()).toEqual(["a.png", "b.png"]); // 并发 2：c 还没发出请求

  gates.get("b.png")!(); // b 先完成：只有 b 换成图片，a 仍在上传，c 补上开始上传
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toHaveAccessibleName("a.png");
  await expect(cards.nth(0)).toHaveAttribute("data-state", "uploading");
  await expect.poll(() => requested.length).toBe(3);
  gates.get("c.png")!();
  gates.get("a.png")!();
  await expect(cards).toHaveCount(0, { timeout: 15_000 });

  const lines = (await editor.inputValue()).split("\n").map((line) => /^!\[(\w)\]\(\/img\//.exec(line)?.[1]);
  expect(lines).toEqual(["a", "b", "c"]);
  expect((await samples()).every((s) => s.states.filter((state, i) => state !== "waiting" && !s.leaving[i]).length <= 2)).toBe(true);
});

// [TC-US05-39][SC-IMAGE-09] 两张图上传中，作者用退格删掉第一个占位（受控正文的真实按键）：第一张完成后不再插入，
// 第二张的卡片仍在、完成后替换到它自己的占位
test("[TC-US05-39] 上传中删掉一个占位，其余仍替换到原位置", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "删占位");
  const release = await holdUploads(page);
  await dropFiles(page, editor, [png("a.png", [20, 20]), png("b.png", [30, 30])]);
  await expect(editor).toHaveValue("![上传中…]()\n![上传中…]()", { timeout: 20_000 });
  await editor.focus();
  await editor.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(0, "![上传中…]()\n".length));
  await page.keyboard.press("Backspace");
  await expect(editor).toHaveValue("![上传中…]()");
  const cards = page.getByTestId("md-preview").getByTestId("upload-card");
  await expect(cards).toHaveCount(1);
  await expect(cards).toHaveAccessibleName("b.png");
  release();
  await expect(editor).toHaveValue(/^!\[b\]\(\/img\/[^)]+\)$/, { timeout: 15_000 });
});
