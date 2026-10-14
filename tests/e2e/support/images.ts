import type { Locator, Page } from "@playwright/test";

export const IMAGE_URL = /^\/img\/\d{4}\/\d{2}\/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.(png|jpg|webp|gif)$/;

export interface FakeFile {
  name: string;
  type: string;
  // "png"：页面内用 canvas 生成可解码的 PNG（width×height）；数字：该字节数的填充内容
  content: { png: [number, number] } | { bytes: number };
}

// 在页面中构造 File 列表（canvas 生成真实 PNG，或指定字节数的填充文件）
async function makeFiles(page: Page, files: FakeFile[]) {
  return page.evaluateHandle(async (specs) => {
    const list: File[] = [];
    for (const spec of specs) {
      let blob: Blob;
      if ("png" in spec.content) {
        const [w, h] = spec.content.png;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#8a7b6c";
        ctx.fillRect(0, 0, w, h);
        blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
      } else {
        blob = new Blob([new Uint8Array(spec.content.bytes)]);
      }
      list.push(new File([blob], spec.name, { type: spec.type }));
    }
    return list;
  }, files);
}

// 派发带文件的 paste 事件（WebKit 不支持在 ClipboardEvent 构造参数里传 clipboardData，统一用属性注入）
export async function pasteFiles(page: Page, target: Locator, files: FakeFile[]) {
  const handle = await makeFiles(page, files);
  await target.evaluate((element, list) => {
    const data = new DataTransfer();
    for (const file of list) data.items.add(file);
    const event = new Event("paste", { bubbles: true, cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: data });
    element.dispatchEvent(event);
  }, handle);
}

// 扣住上传请求，直到调用返回的 release()（断言上传中的状态时不依赖固定延迟，避免并行负载下预览渲染慢于延迟）
export async function holdUploads(page: Page): Promise<() => void> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/admin/images", async (route) => {
    await gate;
    await route.continue();
  });
  return release;
}
