import { expect, test, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { holdUploads, IMAGE_URL, pasteFiles } from "./support/images";

const SHOT = { name: "image.png", type: "image/png", content: { png: [64, 48] as [number, number] } };

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

const value = (editor: ReturnType<Page["getByRole"]>) => editor.inputValue();

// [TC-US05-01][SC-IMAGE-01] 粘贴截图：上传 1 次，光标处插入 ![image](站内地址)，原文不变；预览显示该图片且已解码
test("[TC-US05-01] 粘贴图片上传并插入引用", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "P", "第一段");
  await editor.press("Enter");
  let uploads = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/admin/images")) uploads++;
  });
  const response = page.waitForResponse((r) => r.url().endsWith("/api/admin/images"));
  await pasteFiles(page, editor, [SHOT]);
  const { url } = (await (await response).json()) as { url: string };

  expect(url).toMatch(IMAGE_URL);
  await expect(editor).toHaveValue(`第一段\n![image](${url})`);
  const image = page.getByTestId("md-preview").locator(`img[src="${url}"]`);
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(64);
  expect(uploads).toBe(1);
});

// [TC-US05-23][SC-IMAGE-01] 上传中：源码是占位、预览显示"图片上传中… 文件名"而不是图片；完成后占位被替换，预览出现图片
test("[TC-US05-23] 占位文本出现与替换、预览区渲染图片", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "Q", "");
  const release = await holdUploads(page);
  await pasteFiles(page, editor, [SHOT]);

  await expect(editor).toHaveValue("![上传中…]()");
  const preview = page.getByTestId("md-preview");
  await expect(preview.getByText("图片上传中… image.png")).toBeVisible();
  await expect(preview.locator("img")).toHaveCount(0);
  release();

  await expect(editor).not.toHaveValue(/上传中…/, { timeout: 10_000 });
  const url = (await value(editor)).match(/^!\[image\]\((.+)\)$/)?.[1];
  expect(url).toMatch(IMAGE_URL);
  await expect(preview.locator(`img[src="${url}"]`)).toBeVisible();
  await expect(preview.getByText(/图片上传中/)).toHaveCount(0);
});

// [TC-US05-24][SC-IMAGE-09] 上传期间在占位前、后继续输入：引用恰好替换占位，新输入的文字不变
test("[TC-US05-24] 上传期间在占位符前继续输入", async ({ page, baseURL }) => {
  const editor = await openPost(page, baseURL!, "R", "开头");
  await editor.press("Enter");
  const release = await holdUploads(page);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/admin/images"));
  await pasteFiles(page, editor, [SHOT]);
  await expect(editor).toHaveValue("开头\n![上传中…]()");

  await editor.press("ControlOrMeta+Home");
  await page.keyboard.type("新增文字，");
  await editor.press("ControlOrMeta+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("结尾");
  release();
  const { url } = (await (await response).json()) as { url: string };

  await expect(editor).toHaveValue(`新增文字，开头\n![image](${url})\n结尾`);
  // 替换后作者光标仍在末尾：继续输入接在"结尾"之后
  await page.keyboard.type("。");
  await expect(editor).toHaveValue(`新增文字，开头\n![image](${url})\n结尾。`);
});
