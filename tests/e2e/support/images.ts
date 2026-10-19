import type { Locator, Page } from "@playwright/test";

export const IMAGE_URL = /^\/img\/\d{4}\/\d{2}\/[a-z2-7]{10}_\d+x\d+_[0-9a-f]{6}\.(png|jpg|webp|gif)$/;

export interface FakeFile {
  name: string;
  type: string;
  // png / jpeg：页面内用 canvas 生成可解码的图片（宽×高）；bytes：该字节数的填充内容；
  // photo：类照片的 JPEG（渐变 + 细噪点，左上角 200×200 红块用来判断方向，见 drawPhoto）
  content: { png: [number, number] } | { jpeg: [number, number] } | { photo: [number, number] } | { bytes: number };
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
      } else if ("photo" in spec.content) {
        const [w, h] = spec.content.photo;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, "#d9a066");
        gradient.addColorStop(0.5, "#5b7f95");
        gradient.addColorStop(1, "#2d3a2e");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        const tile = ctx.createImageData(256, 256);
        let seed = 7;
        for (let i = 0; i < tile.data.length; i += 4) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff;
          const v = seed % 48;
          tile.data.set([v, v, v, 40], i);
        }
        const noise = document.createElement("canvas");
        noise.width = noise.height = 256;
        noise.getContext("2d")!.putImageData(tile, 0, 0);
        ctx.fillStyle = ctx.createPattern(noise, "repeat")!;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(0, 0, 200, 200);
        blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95));
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

// 读取页面里生成的文件字节（用于在 Node 侧加工后再经 dropBytes 拖入）
export async function fileBytes(page: Page, file: FakeFile): Promise<Uint8Array> {
  const handle = await makeFiles(page, [file]);
  const values = await handle.evaluate(async ([f]) => [...new Uint8Array(await f.arrayBuffer())]);
  return new Uint8Array(values);
}

// 在 JPEG 的 SOI 之后插入 APP1 Exif：IFD0 含 Orientation 与 GPSInfo 指针，GPS IFD 含 GPSVersionID（小端序 TIFF）
export function withExif(jpeg: Uint8Array, orientation: number): Uint8Array {
  const tiff = Buffer.alloc(8 + 2 + 2 * 12 + 4 + 2 + 12 + 4);
  tiff.write("II", 0, "latin1");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(2, 8);
  const gpsOffset = 8 + 2 + 2 * 12 + 4;
  const entry = (at: number, tag: number, type: number, count: number, value: number, short = false) => {
    tiff.writeUInt16LE(tag, at);
    tiff.writeUInt16LE(type, at + 2);
    tiff.writeUInt32LE(count, at + 4);
    if (short) tiff.writeUInt16LE(value, at + 8);
    else tiff.writeUInt32LE(value, at + 8);
  };
  entry(10, 0x0112, 3, 1, orientation, true);
  entry(22, 0x8825, 4, 1, gpsOffset);
  tiff.writeUInt32LE(0, 34);
  tiff.writeUInt16LE(1, gpsOffset);
  tiff.writeUInt16LE(0x0000, gpsOffset + 2);
  tiff.writeUInt16LE(1, gpsOffset + 4);
  tiff.writeUInt32LE(4, gpsOffset + 6);
  tiff.set([2, 2, 0, 0], gpsOffset + 10);
  tiff.writeUInt32LE(0, gpsOffset + 14);
  const payload = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiff]);
  const header = Buffer.from([0xff, 0xe1, (payload.length + 2) >> 8, (payload.length + 2) & 0xff]);
  return new Uint8Array(Buffer.concat([Buffer.from(jpeg.subarray(0, 2)), header, payload, Buffer.from(jpeg.subarray(2))]));
}
