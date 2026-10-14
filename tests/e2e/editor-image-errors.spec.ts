import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { dropFiles, pasteFiles, type FakeFile } from "./support/images";

async function openPost(page: Page, baseURL: string, label: string, body: string) {
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `${label}${Date.now().toString(36)}`, body });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  const editor = page.getByRole("textbox", { name: "正文" });
  await editor.focus();
  await editor.press("ControlOrMeta+End");
  return editor;
}

function countUploads(page: Page) {
  const counter = { value: 0 };
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/admin/images")) counter.value++;
  });
  return counter;
}

const alerts = (page: Page, text: string) => page.getByRole("alert").filter({ hasText: text });
const png = (name: string, padTo?: number): FakeFile => ({ name, type: "image/png", content: { png: [20, 20] }, padTo });
const SVG: FakeFile = { name: "logo.svg", type: "image/svg+xml", content: { bytes: 64 } };

// [TC-US05-07][SC-IMAGE-05] 50MB+1 字节（拖入）与 60MB（粘贴）前端拦截：各提示一次，不上传，正文不变（无占位）
test("[TC-US05-07] 边界：50MB+1 字节前端拒绝", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "B", "原文");
  const uploads = countUploads(page);
  await dropFiles(page, editor, [png("over-50mb.png", 52_428_801)]);
  await pasteFiles(page, editor, [{ name: "big-60mb.jpg", type: "image/jpeg", content: { jpeg: [20, 20] }, padTo: 62_914_560 }]);

  await expect(alerts(page, "图片不能超过 50MB")).toHaveCount(2);
  await expect(editor).toHaveValue("原文");
  expect(uploads.value).toBe(0);
});

// [TC-US05-09][TC-US05-10][SC-IMAGE-06] 拖入 svg、文件选择器选 pdf：提示仅支持的格式，不上传，不弹 alert
test("[TC-US05-09][TC-US05-10] svg 与 pdf 被前端拒绝", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "S", "原文");
  const uploads = countUploads(page);
  let dialogs = 0;
  page.on("dialog", (dialog) => {
    dialogs++;
    void dialog.dismiss();
  });
  await dropFiles(page, editor, [SVG]);
  await expect(alerts(page, "仅支持 png、jpg、webp、gif")).toHaveCount(1);

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "插入图片" }).click();
  await (await chooser).setFiles({ name: "doc.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7\n") });
  await expect(alerts(page, "仅支持 png、jpg、webp、gif")).toHaveCount(2);

  await expect(editor).toHaveValue("原文");
  expect({ uploads: uploads.value, dialogs }).toEqual({ uploads: 0, dialogs: 0 });
});

// [TC-US05-11][SC-IMAGE-04][SC-IMAGE-05][SC-IMAGE-06] 混合拖入：只上传 a、c，按顺序插入；被拒的两个带文件名提示
test("[TC-US05-11] 混合拖入：仅合法图片被插入", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "X", "");
  const uploads = countUploads(page);
  await dropFiles(page, editor, [png("a.png"), png("over-50mb.png", 52_428_801), SVG, png("c.png")]);

  await expect(editor).toHaveValue(/^!\[a\]\(\/img\/[^)]+\)\n!\[c\]\(\/img\/[^)]+\)$/, { timeout: 10_000 });
  await expect(alerts(page, "over-50mb.png：图片不能超过 50MB")).toBeVisible();
  await expect(alerts(page, "logo.svg：仅支持 png、jpg、webp、gif")).toBeVisible();
  expect(uploads.value).toBe(2);
});

// [TC-US05-12][SC-IMAGE-07] 离线粘贴：占位移除、提示上传失败，正文与粘贴前逐字一致
test("[TC-US05-12] 离线粘贴：移除占位并提示", async ({ page, context, baseURL }) => {
  const editor = await openPost(page, baseURL!, "O", "段落A\n段落B");
  await editor.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(4, 4)); // "段落A\n" 之后
  await context.setOffline(true);
  await pasteFiles(page, editor, [png("image.png")]);

  await expect(alerts(page, "上传失败，请重试")).toBeVisible();
  await expect(editor).toHaveValue("段落A\n段落B");
  await context.setOffline(false);
});

// [TC-US05-13][SC-IMAGE-07] 连接中断、服务端 500：各自移除占位并提示；取消拦截后再粘贴可成功
test("[TC-US05-13] 服务端 500 / 请求中断：移除占位并提示", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "E", "原文");
  await page.route("**/api/admin/images", (route) => route.abort("connectionreset"));
  await pasteFiles(page, editor, [png("1x1.png")]);
  await expect(alerts(page, "上传失败，请重试")).toHaveCount(1);
  await expect(editor).toHaveValue("原文");

  await page.unrouteAll();
  await page.route("**/api/admin/images", (route) => route.fulfill({ status: 500, body: "{}" }));
  await pasteFiles(page, editor, [png("1x1.png")]);
  await expect(alerts(page, "上传失败，请重试")).toHaveCount(2);
  await expect(editor).toHaveValue("原文");

  await page.unrouteAll();
  await pasteFiles(page, editor, [png("1x1.png")]);
  await expect(editor).toHaveValue(/^原文!\[1x1\]\(\/img\/[^)]+\)$/);
});

// [TC-US05-25][SC-IMAGE-07][SC-IMAGE-09] 上传中在开头输入，最终失败：只移除占位，新输入保留
test("[TC-US05-25] 上传失败时上传期间输入的文字保留", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "K", "开头");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/admin/images", async (route) => {
    await gate;
    await route.abort();
  });
  await pasteFiles(page, editor, [png("image.png")]);
  await expect(editor).toHaveValue("开头![上传中…]()");
  await editor.press("ControlOrMeta+Home");
  await page.keyboard.type("补充");
  release();

  await expect(alerts(page, "上传失败，请重试")).toBeVisible();
  await expect(editor).toHaveValue("补充开头");
});

