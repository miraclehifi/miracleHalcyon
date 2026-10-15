// US-11 动态照片夹具（测试数据策略"夹具清单"）：真实样本只有 OPPO 一张（提交在本目录），其余在内存中由它派生，不另存文件。
// 派生图的静态图部分用一张不含 XMP 的普通 JPEG，在 SOI 之后插入一段 XMP（APP1），再拼上视频
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { mp4End } from "../../../src/lib/upload/extract-motion-photo";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export const OPPO_PATH = here("./IMG20260516172228.jpg");
const STILL_PATH = here("../images/dddddddddd_1000x1000_778899.jpg");
const H264_PATH = here("../images/jjjjjjjjjj_960x1280_6b7f8e.live.mp4"); // 无音轨 H.264

const latin1 = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
};

export const oppo = () => new Uint8Array(readFileSync(OPPO_PATH));

// OPPO 样本的结构：主视频起点（= 静态图长度）、主视频结束、副视频（HEVC）
export function oppoLayout() {
  const bytes = oppo();
  const length = Number(/Item:Semantic="MotionPhoto"[^>]*Item:Length="(\d+)"|Item:Length="(\d+)"[^>]*Item:Semantic="MotionPhoto"/.exec(latin1(bytes.subarray(0, 512 * 1024)))!.slice(1).find(Boolean));
  const start = bytes.length - length;
  const mainEnd = mp4End(bytes, start);
  // 主视频之后是一段 OPPO 私有数据，再往后才是副视频的 ftyp
  const next = latin1(bytes.subarray(mainEnd)).indexOf("ftyp");
  const secondaryStart = mainEnd + next - 4;
  const secondary = bytes.subarray(secondaryStart, mp4End(bytes, secondaryStart));
  return { bytes, start, mainEnd, secondary };
}

// 无音轨 H.264 mp4，末尾用 free box 补到恰好 size 字节
export function h264Video(size: number): Uint8Array {
  const base = new Uint8Array(readFileSync(H264_PATH));
  const pad = size - base.length;
  if (pad < 8) throw new Error("目标大小太小");
  const free = new Uint8Array(pad);
  new DataView(free.buffer).setUint32(0, pad);
  free.set([0x66, 0x72, 0x65, 0x65], 4); // "free"
  return concat(base, free);
}

const XMP_HEADER = new TextEncoder().encode("http://ns.adobe.com/xap/1.0/\0");
function xmpSegment(attributes: string, body = ""): Uint8Array {
  const packet = new TextEncoder().encode(
    `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:GCamera="http://ns.google.com/photos/1.0/camera/" xmlns:Container="http://ns.google.com/photos/1.0/container/" xmlns:Item="http://ns.google.com/photos/1.0/container/item/" ${attributes}>${body}</rdf:Description></rdf:RDF></x:xmpmeta>`,
  );
  const length = 2 + XMP_HEADER.length + packet.length;
  return concat(new Uint8Array([0xff, 0xe1, length >> 8, length & 0xff]), XMP_HEADER, packet);
}

// format：item = Motion Photo v1（Container:Item Item:Length）；micro = 旧版 MicroVideoOffset
export function motionPhoto(video: Uint8Array, format: "item" | "micro"): { bytes: Uint8Array; stillLength: number } {
  const still = new Uint8Array(readFileSync(STILL_PATH));
  const xmp =
    format === "item"
      ? xmpSegment(
          'GCamera:MotionPhoto="1" GCamera:MotionPhotoVersion="1"',
          `<Container:Directory><rdf:Seq><rdf:li rdf:parseType="Resource"><Container:Item Item:Mime="image/jpeg" Item:Semantic="Primary" Item:Length="0"/></rdf:li><rdf:li rdf:parseType="Resource"><Container:Item Item:Mime="video/mp4" Item:Semantic="MotionPhoto" Item:Length="${video.length}"/></rdf:li></rdf:Seq></Container:Directory>`,
        )
      : xmpSegment(`GCamera:MicroVideo="1" GCamera:MicroVideoVersion="1" GCamera:MicroVideoOffset="${video.length}"`);
  const stillWithXmp = concat(still.subarray(0, 2), xmp, still.subarray(2));
  return { bytes: concat(stillWithXmp, video), stillLength: stillWithXmp.length };
}

// 夹具清单里的派生文件（名称 → 字节）
export function derivedFixtures(): Record<string, Uint8Array> {
  const { secondary } = oppoLayout();
  return {
    "MVIMG_0002.jpg": motionPhoto(secondary, "micro").bytes,
    "IMG_4000.jpg": motionPhoto(secondary, "item").bytes,
    "IMG_2100.jpg": motionPhoto(h264Video(10 * 1024 * 1024), "item").bytes,
    "IMG_2101.jpg": motionPhoto(h264Video(10 * 1024 * 1024 + 1), "item").bytes,
    "IMG_3000.jpg": oppo(),
  };
}
