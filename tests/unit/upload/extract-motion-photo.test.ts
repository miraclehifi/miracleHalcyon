import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractMotionPhoto } from "../../../src/lib/upload/extract-motion-photo";
import { h264Video, motionPhoto, oppoLayout } from "../../fixtures/live/motion-photos";

const buffer = (bytes: Uint8Array) => bytes.slice().buffer;
const head = async (blob: Blob) => [...new Uint8Array(await blob.slice(4, 8).arrayBuffer())].map((c) => String.fromCharCode(c)).join("");

// UT-142（SC-LIVE-03）
describe("extractMotionPhoto", () => {
  it("OPPO 样本（Item:Length 覆盖主视频、副视频与私有尾部）：按顶层 box 截到主视频结束，静态图为视频起点之前的字节", async () => {
    const { bytes, start, mainEnd } = oppoLayout();
    const result = extractMotionPhoto(buffer(bytes))!;
    expect({ still: result.still.size, video: result.video.size, ftyp: await head(result.video), tail: bytes.length > mainEnd }).toEqual({
      still: start,
      video: mainEnd - start,
      ftyp: "ftyp",
      tail: true,
    });
  });

  it("Item:Length 与旧版 MicroVideoOffset 两种写法都能切出视频", async () => {
    const video = h264Video(200_000);
    const results = await Promise.all(
      (["item", "micro"] as const).map(async (format) => {
        const { bytes, stillLength } = motionPhoto(video, format);
        const result = extractMotionPhoto(buffer(bytes))!;
        return { still: result.still.size === stillLength, video: result.video.size, ftyp: await head(result.video) };
      }),
    );
    expect(results).toEqual([
      { still: true, video: 200_000, ftyp: "ftyp" },
      { still: true, video: 200_000, ftyp: "ftyp" },
    ]);
  });

  it("没有 XMP、长度越界、起点不是 ftyp、不是 JPEG → null", () => {
    const plain = new Uint8Array(readFileSync("tests/fixtures/images/bbbbbbbbbb_1200x800_112233.jpg"));
    const { bytes } = motionPhoto(h264Video(200_000), "item");
    const shifted = bytes.slice(0, bytes.length - 1); // 长度对不上：起点落在 ftyp 前一个字节
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, ...bytes.subarray(4)]);
    expect([plain, shifted, png].map((item) => extractMotionPhoto(buffer(item)))).toEqual([null, null, null]);
  });
});
