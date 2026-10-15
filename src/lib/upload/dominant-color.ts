// 主色与尺寸（media-upload module-spec §2，ADR-005 文件名带主色）：上传前把图片解码为位图，缩到 32×32 采样，
// 排除亮度 < 8% 和 > 92% 的像素（以及半透明像素）后取平均，输出 6 位小写 hex；全部被排除时退回全体平均。
// 主色与宽高随上传请求上报（服务端宽高以文件头为准）；浏览器解码不了（不支持 createImageBitmap 或文件损坏）时返回 null，
// 按缺省主色上传，由服务端照常校验
const SAMPLE = 32;
const DARK = 0.08;
const LIGHT = 0.92;

export interface ImageMeta {
  width: number;
  height: number;
  rgb: string;
}

const hex = (value: number) => Math.round(value).toString(16).padStart(2, "0");

// RGBA 像素 → 主色
export function dominantColorFromPixels(data: Uint8ClampedArray): string {
  const all = [0, 0, 0, 0];
  const kept = [0, 0, 0, 0];
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    all[0] += r;
    all[1] += g;
    all[2] += b;
    all[3]++;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    if (luminance < DARK || luminance > LIGHT) continue;
    kept[0] += r;
    kept[1] += g;
    kept[2] += b;
    kept[3]++;
  }
  const [r, g, b, n] = kept[3] > 0 ? kept : all;
  return n > 0 ? hex(r / n) + hex(g / n) + hex(b / n) : "808080";
}

export function dominantColor(bitmap: ImageBitmap): string {
  const canvas = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(SAMPLE, SAMPLE) : Object.assign(document.createElement("canvas"), { width: SAMPLE, height: SAMPLE });
  const context = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!context) return "808080";
  context.drawImage(bitmap, 0, 0, SAMPLE, SAMPLE);
  return dominantColorFromPixels(context.getImageData(0, 0, SAMPLE, SAMPLE).data);
}

export async function measureImage(file: Blob): Promise<ImageMeta | null> {
  if (typeof createImageBitmap !== "function") return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    return { width: bitmap.width, height: bitmap.height, rgb: dominantColor(bitmap) };
  } finally {
    bitmap.close();
  }
}
