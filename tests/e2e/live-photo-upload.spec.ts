import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { dropFiles, holdUploads } from "./support/images";

// US-11 上传前处理（media-upload module-spec §1）：占位"处理中…"→"上传中…"，主色与宽高随请求上报
async function openPost(page: Page, baseURL: string, body = "") {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `[E2E-US11] 上传 ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, body });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  return page.getByRole("textbox", { name: "正文" });
}

// 扣住页面里的图片解码（createImageBitmap），直到调用返回的 release()
async function holdDecoding(page: Page): Promise<() => Promise<void>> {
  await page.addInitScript(() => {
    const original = window.createImageBitmap.bind(window);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    Object.assign(window, { __releaseDecode: release });
    window.createImageBitmap = (async (...args: Parameters<typeof createImageBitmap>) => {
      await gate;
      return original(...args);
    }) as typeof createImageBitmap;
  });
  return () => page.evaluate(() => (window as unknown as { __releaseDecode: () => void }).__releaseDecode());
}

const channels = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));

// [TC-US11-22][SC-LIVE-05] 占位依次"处理中…"→"上传中…"→引用；预览占位块；请求带宽高与主色（夹具底色 #8a7b6c），key 主色与之一致
test("[TC-US11-22] 占位依次显示处理中、上传中，请求带主色与宽高", async ({ page, baseURL }) => {
  const releaseDecode = await holdDecoding(page);
  const releaseUpload = await holdUploads(page);
  const editor = await openPost(page, baseURL!);
  const preview = page.getByTestId("md-preview");
  const request = page.waitForRequest((r) => r.url().endsWith("/api/admin/images") && r.method() === "POST");

  await dropFiles(page, editor, [{ name: "b.jpg", type: "image/jpeg", content: { jpeg: [64, 48] } }]);
  await expect(editor).toHaveValue("![处理中…]()");
  await expect(preview.getByText("图片处理中… b.jpg")).toBeVisible();

  await releaseDecode();
  await expect(editor).toHaveValue("![上传中…]()");
  await expect(preview.getByText("图片上传中… b.jpg")).toBeVisible();
  const form = (await request).postDataBuffer()!.toString("latin1");
  const field = (name: string) => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(form)?.[1];
  const rgb = field("rgb")!;
  expect([field("width"), field("height")]).toEqual(["64", "48"]);
  expect(rgb).toMatch(/^[0-9a-f]{6}$/);
  channels(rgb).forEach((value, i) => expect(Math.abs(value - channels("8a7b6c")[i])).toBeLessThanOrEqual(4)); // JPEG 有损，允许小误差

  releaseUpload();
  await expect(editor).toHaveValue(new RegExp(`^!\\[b\\]\\(/img/\\d{4}/\\d{2}/[a-z2-7]{10}_64x48_${rgb}\\.jpg\\)$`), { timeout: 15_000 });
});
