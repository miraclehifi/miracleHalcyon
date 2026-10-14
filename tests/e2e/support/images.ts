import type { Locator, Page } from "@playwright/test";

export const IMAGE_URL = /^\/img\/\d{4}\/\d{2}\/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.(png|jpg|webp|gif)$/;

export interface FakeFile {
  name: string;
  type: string;
  // png / jpeg：页面内用 canvas 生成可解码的图片（宽×高）；bytes：该字节数的填充内容
  content: { png: [number, number] } | { jpeg: [number, number] } | { bytes: number };
  padTo?: number; // 在图片末尾补零到恰好该字节数（文件头不变，仍能通过服务端嗅探）
}

// 在页面中构造 File 列表
export async function makeFiles(page: Page, files: FakeFile[]) {
  return page.evaluateHandle(async (specs) => {
    const list: File[] = [];
    for (const spec of specs) {
      let blob: Blob;
      if ("bytes" in spec.content) {
        blob = new Blob([new Uint8Array(spec.content.bytes)]);
      } else {
        const [type, [w, h]] = "png" in spec.content ? ["image/png", spec.content.png] : ["image/jpeg", spec.content.jpeg];
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#8a7b6c";
        ctx.fillRect(0, 0, w, h);
        blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), type));
      }
      if (spec.padTo) blob = new Blob([blob, new Uint8Array(spec.padTo - blob.size)]);
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

// 在源码区第 line 行（从 1 开始）的最右侧派发拖放事件（落点在该行末尾之后）
export async function dropFiles(page: Page, target: Locator, files: FakeFile[], line = 1, events = ["dragenter", "dragover", "drop"]) {
  const handle = await makeFiles(page, files);
  await target.evaluate(
    (element, { list, line, events }) => {
      const data = new DataTransfer();
      for (const file of list) data.items.add(file);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const lineHeight = parseFloat(style.lineHeight);
      const clientX = rect.right - 8;
      const clientY = rect.top + element.clientTop + parseFloat(style.paddingTop) + lineHeight * (line - 0.5);
      for (const type of events) element.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data, clientX, clientY }));
    },
    { list: handle, line, events },
  );
}
