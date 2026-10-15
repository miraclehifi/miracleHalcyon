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

export interface ByteFile {
  name: string;
  type: string;
  bytes: Uint8Array;
}

// 在源码区第 line 行末尾派发拖放事件，载荷为给定字节的文件（真实样本 / 派生夹具；以 base64 传入页面）
export async function dropBytes(page: Page, target: Locator, files: ByteFile[], line = 1) {
  const handle = await page.evaluateHandle(
    (specs) =>
      specs.map(({ name, type, base64 }) => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new File([bytes], name, { type });
      }),
    files.map(({ name, type, bytes }) => ({ name, type, base64: Buffer.from(bytes).toString("base64") })),
  );
  await target.evaluate(
    (element, { list, line }) => {
      const data = new DataTransfer();
      for (const file of list) data.items.add(file);
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const clientY = rect.top + element.clientTop + parseFloat(style.paddingTop) + parseFloat(style.lineHeight) * (line - 0.5);
      for (const type of ["dragenter", "dragover", "drop"]) element.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: data, clientX: rect.right - 8, clientY }));
    },
    { list: handle, line },
  );
}

// multipart 请求体中各字段的字节（按 Content-Type 里的 boundary 切分）
export function multipartFields(body: Buffer, contentType: string): Record<string, Buffer> {
  const boundary = Buffer.from(`--${/boundary=(.+)$/.exec(contentType)![1]}`);
  const fields: Record<string, Buffer> = {};
  let pos = body.indexOf(boundary);
  while (pos >= 0) {
    const next = body.indexOf(boundary, pos + boundary.length);
    if (next < 0) break;
    const part = body.subarray(pos + boundary.length + 2, next - 2); // 去掉 boundary 后的 CRLF 与下一个 boundary 前的 CRLF
    const split = part.indexOf("\r\n\r\n");
    const name = /name="([^"]+)"/.exec(part.subarray(0, split).toString("latin1"))?.[1];
    if (name) fields[name] = part.subarray(split + 4);
    pos = next;
  }
  return fields;
}
