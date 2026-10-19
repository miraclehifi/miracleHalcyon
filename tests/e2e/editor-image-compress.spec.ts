import { expect, test, type Locator, type Page } from "@playwright/test";
import { adminApi, login } from "./support/admin";
import { waitForHydration } from "./support/hydration";
import { dropBytes, dropFiles, fileBytes, withExif, type FakeFile } from "./support/images";

// 浏览器端压缩（media-upload-experience 模块 2；TC-US05-29 / 30 / 35）。服务端原样存储收到的字节，
// 所以断言直接读上传后的图片地址（WebKit 下大请求体的 postData 拿不到）

async function openPost(page: Page, baseURL: string, label: string) {
  await login(page);
  const id = await adminApi(page, baseURL).create({ title: `${label}${Date.now().toString(36)}`, body: "" });
  await page.goto(`/admin/posts/${id}`);
  await waitForHydration(page);
  return page.getByRole("textbox", { name: "正文" });
}

const LARGE_PHOTO: FakeFile = { name: "large-photo.jpg", type: "image/jpeg", content: { photo: [4000, 3000] }, padTo: 6_000_000 };

async function uploadedUrl(page: Page) {
  const response = await page.waitForResponse((r) => r.url().endsWith("/api/admin/images") && r.request().method() === "POST", { timeout: 60_000 });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { url: string }).url;
}

// 读图片字节头（魔数）与解码后的尺寸，并取若干位置的像素（判断方向）
async function inspect(page: Page, url: string, points: [number, number][] = []) {
  return page.evaluate(
    async ({ url, points }) => {
      const blob = await (await fetch(url)).blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const pixels = points.map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data.slice(0, 3)]);
      const text = String.fromCharCode(...bytes.subarray(0, 12));
      let hasExif = false;
      for (let i = 0; i < bytes.length - 6 && !hasExif; i++) hasExif = bytes[i] === 0x45 && bytes[i + 1] === 0x78 && bytes[i + 2] === 0x69 && bytes[i + 3] === 0x66 && bytes[i + 4] === 0 && bytes[i + 5] === 0;
      return { type: blob.type, size: bytes.length, head: text, width: bitmap.width, height: bitmap.height, pixels, hasExif };
    },
    { url, points },
  );
}

const isRed = ([r, g, b]: number[]) => r > 200 && g < 60 && b < 60;

// [TC-US05-29][SC-IMAGE-13] 4000×3000、> 5MB 的照片 → 2560×1920，WebP（浏览器导不出 WebP 时 JPEG），< 1.5MB；引用宽高与文件一致
test("[TC-US05-29] 大 JPEG 压缩为长边 2560 的 WebP", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const editor = await openPost(page, baseURL!, "C");
  const url = uploadedUrl(page);
  await dropFiles(page, editor, [LARGE_PHOTO]);
  const src = await url;
  const info = await inspect(page, src);
  const webp = await page.evaluate(async () => {
    const canvas = Object.assign(document.createElement("canvas"), { width: 2, height: 2 });
    canvas.getContext("2d")!.fillRect(0, 0, 2, 2);
    return (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp")))?.type === "image/webp";
  });

  expect({ width: info.width, height: info.height, small: info.size < 1_500_000, exif: info.hasExif }).toEqual({ width: 2560, height: 1920, small: true, exif: false });
  expect(info.head).toMatch(webp ? /^RIFF.{4}WEBP$/s : /^\xff\xd8\xff/);
  expect(src).toMatch(webp ? /_2560x1920_[0-9a-f]{6}\.webp$/ : /_2560x1920_[0-9a-f]{6}\.jpg$/);
  await expect(editor).toHaveValue(`![large-photo](${src})`);
});

// [TC-US05-30][SC-IMAGE-14] canvas 导出 WebP 实际得到 PNG 时，改为 JPEG 0.85
test("[TC-US05-30] 不支持导出 WebP 时压缩为 JPEG", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => {
    const swap = (type?: string) => (type === "image/webp" ? "image/png" : type);
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      return toBlob.call(this, callback, swap(type), quality);
    };
    if (typeof OffscreenCanvas === "function") {
      const convert = OffscreenCanvas.prototype.convertToBlob;
      OffscreenCanvas.prototype.convertToBlob = function (options) {
        return convert.call(this, { ...options, type: swap(options?.type) });
      };
    }
  });
  const editor = await openPost(page, baseURL!, "J");
  const url = uploadedUrl(page);
  await dropFiles(page, editor, [LARGE_PHOTO]);
  const src = await url;
  const info = await inspect(page, src);

  expect({ width: info.width, height: info.height, jpeg: info.head.startsWith("\xff\xd8\xff") }).toEqual({ width: 2560, height: 1920, jpeg: true });
  expect(src).toMatch(/_2560x1920_[0-9a-f]{6}\.jpg$/);
});

// [TC-US05-35][SC-IMAGE-18] 存储为 4000×3000、EXIF Orientation 6、带 GPS：上传结果为 1920×2560 的竖图，红块转到右上角，不含 EXIF
test("[TC-US05-35] EXIF 方向转正并去掉 EXIF / GPS", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const editor = await openPost(page, baseURL!, "O");
  const bytes = withExif(await fileBytes(page, { name: "portrait.jpg", type: "image/jpeg", content: { photo: [4000, 3000] } }), 6);
  const url = uploadedUrl(page);
  await dropBytes(page, editor, [{ name: "portrait.jpg", type: "image/jpeg", bytes }]);
  const src = await url;
  const info = await inspect(page, src, [
    [1920 - 40, 40],
    [40, 40],
  ]);

  expect({ width: info.width, height: info.height, topRightRed: isRed(info.pixels[0]), topLeftRed: isRed(info.pixels[1]), exif: info.hasExif }).toEqual({
    width: 1920,
    height: 2560,
    topRightRed: true,
    topLeftRed: false,
    exif: false,
  });
  expect(src).toMatch(/_1920x2560_[0-9a-f]{6}\.(webp|jpg)$/);
});

// —— 压缩兜底与原样上传（handle-compression-fallbacks；TC-US05-31 / 32 / 34）——

type Drawn = "alpha" | "checker" | "noise";

// 页面里用 canvas 画夹具并导出字节，同时按 compress-image 的做法重编码一次（resized：长边缩到 2560 后的大小），
// 供测试先确认夹具前提成立："缩完 / 重编码不比原图小"
async function drawFixture(page: Page, kind: Drawn, width: number, height: number, type: string, quality?: number) {
  const { bytes, resized } = await page.evaluate(
    async ({ kind, width, height, type, quality }) => {
      const toBlob = (canvas: HTMLCanvasElement, t: string, q?: number) => new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), t, q));
      const canvas = Object.assign(document.createElement("canvas"), { width, height });
      const ctx = canvas.getContext("2d")!;
      if (kind === "alpha") {
        // 半透明渐变 + 若干不透明色块（类截图，带透明通道）
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, "rgba(91, 127, 149, 0.4)");
        gradient.addColorStop(1, "rgba(217, 160, 102, 0.9)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = "#2d3a2e";
        for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % width, (i * 53) % height, 300, 40);
      } else {
        const data = ctx.createImageData(width, height);
        let seed = 1;
        for (let i = 0, p = 0; i < data.data.length; i += 4, p++) {
          if (kind === "checker") {
            const v = ((p % width) + Math.floor(p / width)) % 2 ? 255 : 0; // 1px 棋盘格：原图压得很小，缩放后成摩尔纹反而变大
            data.data.set([v, v, v, 255], i);
          } else {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            data.data.set([seed & 255, (seed >> 8) & 255, (seed >> 16) & 255, 255], i);
          }
        }
        ctx.putImageData(data, 0, 0);
      }
      const blob = await toBlob(canvas, type, quality);
      const scale = Math.min(1, 2560 / Math.max(width, height));
      const target = Object.assign(document.createElement("canvas"), { width: Math.round(width * scale), height: Math.round(height * scale) });
      const tctx = target.getContext("2d")!;
      tctx.imageSmoothingQuality = "high";
      tctx.drawImage(await createImageBitmap(blob), 0, 0, target.width, target.height);
      const again = await toBlob(target, type === "image/png" ? "image/png" : "image/webp", 0.82);
      return { bytes: [...new Uint8Array(await blob.arrayBuffer())], resized: again.size };
    },
    { kind, width, height, type, quality },
  );
  return { bytes: new Uint8Array(bytes), resized };
}

// 多帧 GIF：逻辑屏 width×height、两帧 1×1、后面补注释扩展块到 > padTo 字节（GIF 不进 canvas，只要文件头可被服务端嗅探）
function animatedGif(width: number, height: number, padTo: number): Uint8Array {
  const parts: number[] = [...Buffer.from("GIF89a", "latin1"), width & 255, width >> 8, height & 255, height >> 8, 0x80, 0, 0, 0, 0, 0, 255, 255, 255];
  for (let frame = 0; frame < 2; frame++) {
    parts.push(0x21, 0xf9, 4, 0, 10, 0, 0, 0); // 图形控制扩展：延时 0.1 秒
    parts.push(0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, frame ? 0x4c : 0x44, 0x01, 0); // 1×1 帧，LZW（3 位码）：清除码、颜色 frame、结束码
  }
  parts.push(0x21, 0xfe); // 注释扩展：若干 255 字节的子块
  while (parts.length < padTo) parts.push(255, ...new Array<number>(255).fill(32));
  parts.push(0, 0x3b);
  return new Uint8Array(parts);
}

// 把 JPEG 从 SOS 起的扫描数据全部清零（保留 SOF 宽高，服务端照常嗅探；浏览器解码失败）
function breakJpeg(jpeg: Uint8Array): Uint8Array {
  const out = jpeg.slice();
  for (let i = 2; i < out.length - 1; i++) {
    if (out[i] === 0xff && out[i + 1] === 0xda) {
      out.fill(0, i, out.length - 2);
      break;
    }
  }
  return out;
}

// 上传后 GET 回来的字节（服务端原样存储收到的字节）
async function uploadedBytes(page: Page, baseURL: string, src: string) {
  const response = await page.request.get(`${baseURL}${src}`);
  return new Uint8Array(await response.body());
}

const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && Buffer.from(a).equals(Buffer.from(b));

// 拖入一份字节，等到上传完成，返回引用地址
async function dropAndUpload(page: Page, editor: Locator, file: { name: string; type: string; bytes: Uint8Array }) {
  const url = uploadedUrl(page);
  await dropBytes(page, editor, [file]);
  const src = await url;
  await expect(editor).toHaveValue(new RegExp(`\\(${src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`));
  return src;
}

// [TC-US05-31][SC-IMAGE-15] PNG 只缩尺寸、仍为 PNG 且带 alpha；缩完不比原图小的 PNG 用原图
test("[TC-US05-31] PNG 只缩尺寸，缩完更大时用原图", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const editor = await openPost(page, baseURL!, "P");
  const wide = await drawFixture(page, "alpha", 3840, 2160, "image/png");
  const flat = await drawFixture(page, "checker", 3000, 1000, "image/png");
  expect(flat.resized).toBeGreaterThanOrEqual(flat.bytes.length); // 夹具前提：缩完不比原图小

  const wideSrc = await dropAndUpload(page, editor, { name: "wide-screenshot.png", type: "image/png", bytes: wide.bytes });
  const wideBytes = await uploadedBytes(page, baseURL!, wideSrc);
  const ihdr = Buffer.from(wideBytes.subarray(0, 26));
  expect({
    png: ihdr.subarray(0, 4).toString("latin1"),
    width: ihdr.readUInt32BE(16),
    height: ihdr.readUInt32BE(20),
    alpha: (ihdr[25] & 4) === 4,
  }).toEqual({ png: "\x89PNG", width: 2560, height: 1440, alpha: true });
  expect(wideSrc).toMatch(/_2560x1440_[0-9a-f]{6}\.png$/);

  await editor.press("ControlOrMeta+End");
  const flatSrc = await dropAndUpload(page, editor, { name: "flat-3000x1000.png", type: "image/png", bytes: flat.bytes });
  expect(same(await uploadedBytes(page, baseURL!, flatSrc), flat.bytes)).toBe(true);
  expect(flatSrc).toMatch(/_3000x1000_[0-9a-f]{6}\.png$/);
});

// [TC-US05-32][SC-IMAGE-16] GIF（多帧、> 500KB）、1200×800 小 JPEG、200KB PNG 截图：字节与原文件一致
test("[TC-US05-32] GIF 与小图原样上传", async ({ page, baseURL }) => {
  test.setTimeout(120_000);
  const editor = await openPost(page, baseURL!, "G");
  const gif = animatedGif(3000, 2000, 520_000);
  const small = await fileBytes(page, { name: "small.jpg", type: "image/jpeg", content: { photo: [1200, 800] } });
  const shot = await fileBytes(page, { name: "shot-200k.png", type: "image/png", content: { png: [1600, 900] }, padTo: 200_000 });
  expect(small.length).toBeLessThan(512_000); // 夹具前提：小图低于跳过压缩的阈值

  const files = [
    { name: "anim-large.gif", type: "image/gif", bytes: gif, pattern: /_3000x2000_[0-9a-f]{6}\.gif$/ },
    { name: "small.jpg", type: "image/jpeg", bytes: small, pattern: /_1200x800_[0-9a-f]{6}\.jpg$/ },
    { name: "shot-200k.png", type: "image/png", bytes: shot, pattern: /_1600x900_[0-9a-f]{6}\.png$/ },
  ];
  for (const file of files) {
    await editor.press("ControlOrMeta+End");
    const src = await dropAndUpload(page, editor, file);
    expect({ name: file.name, same: same(await uploadedBytes(page, baseURL!, src), file.bytes), src: file.pattern.test(src) }).toEqual({ name: file.name, same: true, src: true });
  }
});

// [TC-US05-34][SC-IMAGE-17] 重编码不划算（噪点 WebP）、解码失败（扫描数据损坏的 JPEG）、canvas 分配失败：都用原图上传，
// 卡片照常走到上传、最终插入引用，没有错误提示与失败卡片
test("[TC-US05-34] 压缩失败或不划算时退回原图", async ({ page, baseURL }) => {
  test.setTimeout(180_000);
  const editor = await openPost(page, baseURL!, "F");
  const noisy = await drawFixture(page, "noise", 2000, 2000, "image/webp", 0.3);
  expect(noisy.resized).toBeGreaterThanOrEqual(noisy.bytes.length); // 夹具前提：重编码不比原图小
  const broken = breakJpeg(await fileBytes(page, { name: "broken.jpg", type: "image/jpeg", content: { photo: [3000, 2000] } }));
  const photo = await fileBytes(page, LARGE_PHOTO);

  const check = async (file: { name: string; type: string; bytes: Uint8Array }) => {
    await editor.press("ControlOrMeta+End");
    const src = await dropAndUpload(page, editor, file);
    return same(await uploadedBytes(page, baseURL!, src), file.bytes);
  };
  const results = [await check({ name: "noisy.webp", type: "image/webp", bytes: noisy.bytes }), await check({ name: "broken.jpg", type: "image/jpeg", bytes: broken })];
  // canvas 分配失败：getContext 返回 null、OffscreenCanvas 构造抛错（夹具已在此之前生成）
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.getContext = () => null;
    Object.assign(window, {
      OffscreenCanvas: class {
        constructor() {
          throw new RangeError("canvas allocation failed");
        }
      },
    });
  });
  results.push(await check({ name: "large-photo.jpg", type: "image/jpeg", bytes: photo }));

  expect(results).toEqual([true, true, true]);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByTestId("md-preview").locator('[data-testid="upload-card"][data-state="error"]')).toHaveCount(0);
});
