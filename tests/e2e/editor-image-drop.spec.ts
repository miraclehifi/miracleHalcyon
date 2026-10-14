import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { dropFiles, IMAGE_URL, type FakeFile } from "./support/images";

async function openPost(page: Page, baseURL: string, label: string, body: string) {
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `${label}${Date.now().toString(36)}`, body });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  return page.getByRole("textbox", { name: "正文" });
}

const dropOnLine = (page: Page, editor: Locator, files: FakeFile[], line: number, events?: string[]) => dropFiles(page, editor, files, line, events);

const png = (name: string, size?: number): FakeFile => ({ name, type: "image/png", content: { png: [40, 30] }, ...(size ? { padTo: size } : {}) });

// [TC-US05-02][SC-IMAGE-02] 拖到"行2"末尾：引用插在放置位置，alt 为去扩展名的文件名；地址可读取且为 image/jpeg
test("[TC-US05-02] 拖入 photo.jpg 上传并插入到放置位置", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "D", "行1\n行2\n行3");
  const response = page.waitForResponse((r) => r.url().endsWith("/api/admin/images"));
  await dropOnLine(page, editor, [{ name: "photo.jpg", type: "image/jpeg", content: { jpeg: [40, 30] } }], 2);
  const { url } = (await (await response).json()) as { url: string };

  expect(url).toMatch(/\.jpg$/);
  await expect(editor).toHaveValue(`行1\n行2![photo](${url})\n行3`);
  const image = await page.request.get(url);
  expect([image.status(), image.headers()["content-type"]]).toEqual([200, "image/jpeg"]);
});

// [TC-US05-22][SC-IMAGE-02] 带文件拖入显示"松开以上传"，离开消失；再次拖入后放下，提示消失并开始上传
test("[TC-US05-22] 拖放高亮提示松开以上传", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "H", "");
  const hint = page.getByText("松开以上传");
  await dropOnLine(page, editor, [png("a.png")], 1, ["dragenter", "dragover"]);
  await expect(hint).toBeVisible();
  await dropOnLine(page, editor, [png("a.png")], 1, ["dragleave"]);
  await expect(hint).toBeHidden();

  const request = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/admin/images"));
  await dropOnLine(page, editor, [png("a.png")], 1, ["dragenter", "dragover", "drop"]);
  await expect(hint).toBeHidden();
  await request;
});

// [TC-US05-03][SC-IMAGE-03] 工具栏"插入图片"选择 diagram.webp：插在光标处；文件选择只接受 png / jpg / webp / gif
test("[TC-US05-03] 工具栏选择 diagram.webp 上传", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "W", "前文");
  await editor.focus();
  await editor.press("ControlOrMeta+End");
  const webp = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 10;
    canvas.getContext("2d")!.fillRect(0, 0, 20, 10);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp"));
    return blob && blob.type === "image/webp" ? [...new Uint8Array(await blob.arrayBuffer())] : null;
  });
  test.skip(webp === null, "该浏览器 canvas 不能编码 webp");

  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "插入图片" }).click();
  const fileChooser = await chooser;
  expect(await fileChooser.element().getAttribute("accept")).toBe("image/png,image/jpeg,image/webp,image/gif");
  const response = page.waitForResponse((r) => r.url().endsWith("/api/admin/images"));
  await fileChooser.setFiles({ name: "diagram.webp", mimeType: "image/webp", buffer: Buffer.from(webp!) });
  const { url } = (await (await response).json()) as { url: string };

  expect(url).toMatch(/_20x10_808080\.webp$/);
  await expect(editor).toHaveValue(`前文![diagram](${url})`);
});

// [TC-US05-05][SC-IMAGE-04] 一次拖入 a、b、c，a 最慢、b 次之：上传 3 次，正文仍按 a、b、c 各一行，无残留占位
test("[TC-US05-05] 多张图片乱序完成仍按顺序插入", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "M", "");
  const delays: Record<string, number> = { "a.png": 3000, "b.png": 1000, "c.png": 0 };
  let uploads = 0;
  await page.route("**/api/admin/images", async (route) => {
    uploads++;
    const name = /filename="([^"]+)"/.exec(route.request().postDataBuffer()?.toString("latin1") ?? "")?.[1] ?? "";
    await new Promise((resolve) => setTimeout(resolve, delays[name] ?? 0));
    await route.continue();
  });
  await dropOnLine(page, editor, [png("a.png"), png("b.png"), png("c.png")], 1);

  await expect(editor).toHaveValue(/^!\[a\]\(\/img\/[^)]+\)\n!\[b\]\(\/img\/[^)]+\)\n!\[c\]\(\/img\/[^)]+\)$/, { timeout: 15_000 });
  const urls = [...(await editor.inputValue()).matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]);
  expect({ urls: urls.every((url) => IMAGE_URL.test(url)), uploads }).toEqual({ urls: true, uploads: 3 });
});

// [TC-US05-06][SC-IMAGE-05] 恰好 50MB（52,428,800 B）的图片可上传，存储大小一致
test("[TC-US05-06] 边界：恰好 50MB 接受", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "F", "");
  const response = page.waitForResponse((r) => r.url().endsWith("/api/admin/images"));
  await dropOnLine(page, editor, [png("exact-50mb.png", 52_428_800)], 1);
  const result = await response;
  // 请求体过大时 Chromium 会从 inspector 缓存驱逐响应体，result.json() 不可用：地址从正文取
  await expect(editor).toHaveValue(/^!\[exact-50mb\]\(\/img\/[^)]+\)$/);
  const url = (await editor.inputValue()).match(/\((\/img\/[^)]+)\)/)![1];

  expect(result.status()).toBe(201);
  await expect(page.getByText("图片不能超过 50MB")).toHaveCount(0);
  expect((await (await page.request.get(url)).body()).length).toBe(52_428_800);
});
