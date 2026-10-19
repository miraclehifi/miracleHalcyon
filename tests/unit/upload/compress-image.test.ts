import { describe, expect, it, vi } from "vitest";
import {
  compressImage,
  type CompressEnv,
  type DecodedImage,
  fitLongEdge,
  planCompression,
  renameForType,
  sniffFormat,
} from "../../../src/lib/upload/compress-image";

const KB = 1000;
const MB = 1000 * KB;

// UT-153 / TC-US05-33（SC-IMAGE-13、SC-IMAGE-15、SC-IMAGE-16）
describe("planCompression", () => {
  it("决策表：长边 ≤ 2560 且 < 512,000 B 原样；JPEG / WebP 重编码；PNG 只在需要缩尺寸时重编码；GIF 原样", () => {
    expect([
      planCompression({ format: "jpeg", size: 511_999, width: 2560, height: 1440 }),
      planCompression({ format: "jpeg", size: 512_000, width: 2560, height: 1440 }),
      planCompression({ format: "jpeg", size: 100 * KB, width: 2561, height: 1440 }),
      planCompression({ format: "jpeg", size: 100 * KB, width: 1440, height: 2561 }),
      planCompression({ format: "webp", size: 2 * MB, width: 2000, height: 1000 }),
      planCompression({ format: "png", size: 2 * MB, width: 4000, height: 1000 }),
      planCompression({ format: "png", size: 2 * MB, width: 2000, height: 1000 }),
      planCompression({ format: "gif", size: 10 * MB, width: 4000, height: 3000 }),
    ]).toEqual([
      { action: "keep" },
      { action: "encode", width: 2560, height: 1440, output: "lossy" },
      { action: "encode", width: 2560, height: 1439, output: "lossy" },
      { action: "encode", width: 1439, height: 2560, output: "lossy" },
      { action: "encode", width: 2000, height: 1000, output: "lossy" },
      { action: "encode", width: 2560, height: 640, output: "png" },
      { action: "keep" },
      { action: "keep" },
    ]);
  });
});

// UT-154（SC-IMAGE-13、SC-IMAGE-15）
describe("fitLongEdge", () => {
  it("长边缩到上限、短边四舍五入，不放大", () => {
    expect([fitLongEdge(4000, 3000, 2560), fitLongEdge(3000, 4000, 2560), fitLongEdge(2561, 1440, 2560), fitLongEdge(2560, 1440, 2560), fitLongEdge(100, 100, 2560)]).toEqual([
      { width: 2560, height: 1920 },
      { width: 1920, height: 2560 },
      { width: 2560, height: 1439 },
      { width: 2560, height: 1440 },
      { width: 100, height: 100 },
    ]);
  });
});

// 格式按魔数识别（TC-US05-33 第 9 行：魔数为 GIF、MIME 为 image/png → 按 GIF）
describe("sniffFormat", () => {
  it("识别 JPEG / PNG / WebP / GIF 魔数，其余为 null", () => {
    const bytes = (...values: (number | string)[]) => new Uint8Array(values.flatMap((v) => (typeof v === "string" ? [...v].map((c) => c.charCodeAt(0)) : [v])));
    expect([
      sniffFormat(bytes(0xff, 0xd8, 0xff, 0xe0)),
      sniffFormat(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a)),
      sniffFormat(bytes("RIFF", 0, 0, 0, 0, "WEBP")),
      sniffFormat(bytes("GIF89a")),
      sniffFormat(bytes("<svg")),
    ]).toEqual(["jpeg", "png", "webp", "gif", null]);
  });
});

// UT-156（SC-IMAGE-13、SC-IMAGE-14）
describe("renameForType", () => {
  it("扩展名随实际格式变化，没有扩展名时补上", () => {
    expect([renameForType("photo.jpg", "image/webp"), renameForType("photo.JPEG", "image/jpeg"), renameForType("shot.png", "image/png"), renameForType("image", "image/webp")]).toEqual([
      "photo.webp",
      "photo.jpg",
      "shot.png",
      "image.webp",
    ]);
  });
});

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const GIF_HEAD = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

const fileOf = (head: number[], size: number, name: string, type: string) => {
  const bytes = new Uint8Array(size);
  bytes.set(head);
  return new File([bytes], name, { type });
};

// 假环境：decode 给出指定尺寸；encode 按请求的类型返回指定大小的 Blob（可覆盖实际返回的类型）
function env(width: number, height: number, encoded: (type: string) => { size: number; type?: string } | null | Error = () => ({ size: 1000 })) {
  const image: DecodedImage = { width, height, close: vi.fn() };
  const calls: string[] = [];
  const fake: CompressEnv = {
    decode: vi.fn(async () => image),
    encode: vi.fn(async (_image, w, h, type, quality) => {
      calls.push(`${w}x${h} ${type} ${quality ?? ""}`.trim());
      const result = encoded(type);
      if (result instanceof Error) throw result;
      return result && new Blob([new Uint8Array(result.size)], { type: result.type ?? type });
    }),
  };
  return { fake, calls, image };
}

// UT-155（SC-IMAGE-13、SC-IMAGE-14、SC-IMAGE-17、SC-IMAGE-18）
describe("compressImage", () => {
  it("大 JPEG → 2560 长边的 WebP 0.82，文件名与类型随之改变，位图被释放", async () => {
    const { fake, calls, image } = env(4000, 3000);
    const result = await compressImage(fileOf(JPEG_HEAD, 6 * MB, "large-photo.jpg", "image/jpeg"), fake);
    expect({ name: result.name, type: result.type, size: result.size, calls, closed: (image.close as ReturnType<typeof vi.fn>).mock.calls.length }).toEqual({
      name: "large-photo.webp",
      type: "image/webp",
      size: 1000,
      calls: ["2560x1920 image/webp 0.82"],
      closed: 1,
    });
  });

  it("toBlob 不支持 WebP（实际返回 PNG）→ 改用 JPEG 0.85", async () => {
    const { fake, calls } = env(4000, 3000, (type) => (type === "image/webp" ? { size: 900, type: "image/png" } : { size: 800 }));
    const result = await compressImage(fileOf(JPEG_HEAD, 6 * MB, "large-photo.jpg", "image/jpeg"), fake);
    expect({ name: result.name, type: result.type, calls }).toEqual({
      name: "large-photo.jpg",
      type: "image/jpeg",
      calls: ["2560x1920 image/webp 0.82", "2560x1920 image/jpeg 0.85"],
    });
  });

  it("PNG 只缩尺寸、保持 PNG", async () => {
    const { fake, calls } = env(3840, 2160);
    const result = await compressImage(fileOf(PNG_HEAD, 3 * MB, "wide-screenshot.png", "image/png"), fake);
    expect({ name: result.name, type: result.type, calls }).toEqual({ name: "wide-screenshot.png", type: "image/png", calls: ["2560x1440 image/png"] });
  });

  it("兜底：结果不比原图小、解码失败、编码失败或拿不到画布、GIF、小图 → 原文件（同一对象），不抛错", async () => {
    const big = fileOf(JPEG_HEAD, 600 * KB, "noisy.jpg", "image/jpeg");
    const notSmaller = env(2400, 1600, () => ({ size: 600 * KB }));
    const decodeFails = env(4000, 3000);
    (decodeFails.fake.decode as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("decode"));
    const encodeThrows = env(4000, 3000, () => new Error("canvas"));
    const noCanvas = env(4000, 3000, () => null);
    const gif = env(3000, 2000);
    const small = env(1200, 800);
    const gifFile = fileOf(GIF_HEAD, 10 * MB, "anim.gif", "image/png");
    const smallFile = fileOf(JPEG_HEAD, 300 * KB, "small.jpg", "image/jpeg");
    expect([
      (await compressImage(big, notSmaller.fake)) === big,
      (await compressImage(big, decodeFails.fake)) === big,
      (await compressImage(big, encodeThrows.fake)) === big,
      (await compressImage(big, noCanvas.fake)) === big,
      (await compressImage(gifFile, gif.fake)) === gifFile,
      (gif.fake.decode as ReturnType<typeof vi.fn>).mock.calls.length,
      (await compressImage(smallFile, small.fake)) === smallFile,
      small.calls.length,
    ]).toEqual([true, true, true, true, true, 0, true, 0]);
  });
});
