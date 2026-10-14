// 测试用图片字节：只构造文件头（嗅探只读前 64KB 的头部），PNG / GIF 为可解码的完整 1×1 文件
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

export const PNG_1X1 = fromBase64("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
export const GIF_1X1 = fromBase64("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");

const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff];
const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
const le24 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff];
const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff];
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

// JPEG：SOI → APP1（EXIF，SOF 之前）→ DHT（C4，不是 SOF）→ SOFn → EOI
export function jpeg(width: number, height: number, sof = 0xc0): Uint8Array {
  const app1 = [0xff, 0xe1, ...be16(2 + 6 + 8), ...ascii("Exif"), 0, 0, ...new Array(8).fill(0)];
  const dht = [0xff, 0xc4, ...be16(2 + 3), 0, 0, 0];
  const sofSeg = [0xff, sof, ...be16(17), 8, ...be16(height), ...be16(width), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return new Uint8Array([0xff, 0xd8, ...app1, ...dht, ...sofSeg, 0xff, 0xd9]);
}

function riff(chunk: string, data: number[]): Uint8Array {
  const body = [...ascii("WEBP"), ...ascii(chunk), ...le32(data.length), ...data];
  return new Uint8Array([...ascii("RIFF"), ...le32(body.length), ...body]);
}

export function webpVp8(width: number, height: number): Uint8Array {
  return riff("VP8 ", [0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, ...le16(width), ...le16(height), 0, 0]);
}

export function webpVp8l(width: number, height: number): Uint8Array {
  const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
  return riff("VP8L", [0x2f, ...le32(bits), 0]);
}

export function webpVp8x(width: number, height: number): Uint8Array {
  return riff("VP8X", [0, 0, 0, 0, ...le24(width - 1), ...le24(height - 1)]);
}

export function gif89a(width: number, height: number): Uint8Array {
  return new Uint8Array([...ascii("GIF89a"), ...le16(width), ...le16(height), 0, 0, 0, 0x3b]);
}

export const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>');
export const HTML = new TextEncoder().encode("<!doctype html><script>alert(1)</script>");
export const PDF = new TextEncoder().encode("%PDF-1.7\n%âãÏÓ\n");

// ISO BMFF：ftyp box（size 24：major brand + minor version + 2 个兼容 brand），可指定总长度（其余补 0）
export function ftyp(brand: string, totalSize = 24): Uint8Array {
  const header = [0, 0, 0, 24, ...ascii("ftyp"), ...ascii(brand), 0, 0, 2, 0, ...ascii(brand), ...ascii("mp41")];
  const bytes = new Uint8Array(Math.max(totalSize, header.length));
  bytes.set(header);
  return bytes;
}
export const MP4 = ftyp("isom", 4096);
