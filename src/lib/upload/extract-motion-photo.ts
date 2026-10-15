// 安卓动态照片识别（media-upload module-spec §2 extractMotionPhoto，ADR-006 第 1 点，spike 结论）：JPEG 的 XMP 里
// Container:Item Item:Semantic="MotionPhoto" 的 Item:Length，或旧版 GCamera:MicroVideoOffset，都是"视频起点到文件末尾"的字节数。
// 起点处必须是 MP4 的 ftyp box；再按 MP4 顶层 box 截到主视频结束（OPPO 在主视频后追加副视频与私有尾部）。
// 静态图 = 视频起点之前的字节。不是动态照片返回 null（按普通图片上传）
const XMP_SCAN_BYTES = 512 * 1024; // XMP 在文件头部的 APP1 段里；OPPO 的 EXIF 较大，留足余量
const TOP_LEVEL = new Set(["ftyp", "moov", "mdat", "free", "skip", "wide", "uuid", "meta", "udta", "pdin", "sidx"]);

export interface MotionPhoto {
  still: Blob;
  video: Blob;
}

const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));

// 从 start 处的 ftyp 开始累加顶层 box；遇到不认识的类型、越界，或主视频 mdat 之后又出现 ftyp（副视频）即停
export function mp4End(bytes: Uint8Array, start: number): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pos = start;
  let seenMdat = false;
  while (pos + 8 <= bytes.length) {
    let size = view.getUint32(pos);
    const type = ascii(bytes, pos + 4, pos + 8);
    if (size === 1 && pos + 16 <= bytes.length) size = Number(view.getBigUint64(pos + 8));
    if (!TOP_LEVEL.has(type) || size < 8 || pos + size > bytes.length) break;
    if (type === "ftyp" && pos !== start) break;
    if (type === "mdat") seenMdat = true;
    pos += size;
    if (seenMdat && pos + 8 <= bytes.length && ascii(bytes, pos + 4, pos + 8) === "ftyp") break;
  }
  return pos;
}

// XMP 中视频距文件末尾的长度
function videoLength(head: string): number | null {
  const item = /<Container:Item\b[^>]*Item:Semantic="MotionPhoto"[^>]*>/.exec(head)?.[0];
  const length = item && /Item:Length="(\d+)"/.exec(item)?.[1];
  const offset = length ?? /GCamera:MicroVideoOffset="(\d+)"/.exec(head)?.[1];
  const value = Number(offset);
  return Number.isInteger(value) && value > 0 ? value : null;
}

export function extractMotionPhoto(buffer: ArrayBuffer): MotionPhoto | null {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null; // 不是 JPEG
  const length = videoLength(new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, XMP_SCAN_BYTES))));
  if (length === null || length >= bytes.length) return null;
  const start = bytes.length - length;
  if (ascii(bytes, start + 4, start + 8) !== "ftyp") return null;
  const end = mp4End(bytes, start);
  return {
    still: new Blob([bytes.subarray(0, start)], { type: "image/jpeg" }),
    video: new Blob([bytes.subarray(start, end)], { type: "video/mp4" }),
  };
}
