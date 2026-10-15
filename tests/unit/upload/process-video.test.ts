import { describe, expect, it } from "vitest";
import { processVideo, VIDEO_MAX_BYTES } from "../../../src/lib/upload/process-video";

interface Source {
  isMp4?: boolean;
  codec?: string;
  audio?: boolean;
  canDecode?: boolean;
  canEncode?: boolean;
  size?: number; // 输入字节数
  outSize?: number; // 转码 / 转封装后的字节数
}

// mediabunny 的最小替身：只实现 processVideo 用到的部分，记录转换参数
function fakeMediabunny({ isMp4 = true, codec = "hevc", audio = true, canDecode = true, canEncode = true, outSize = 2_000_000 }: Source) {
  const calls: { encode?: unknown; conversion?: { video: unknown; audio: unknown } } = {};
  const MP4 = { name: "MP4" };
  class Output {
    constructor(readonly options: { target: { buffer: ArrayBuffer | null } }) {}
  }
  const lib = {
    ALL_FORMATS: [],
    MP4,
    BlobSource: class {},
    BufferTarget: class {
      buffer: ArrayBuffer | null = null;
    },
    Mp4OutputFormat: class {},
    Output,
    Input: class {
      getPrimaryVideoTrack = async () => ({
        getCodec: async () => codec,
        getDisplayWidth: async () => 3840,
        getDisplayHeight: async () => 2880,
        canDecode: async () => canDecode,
      });
      getFormat = async () => (isMp4 ? MP4 : { name: "QuickTime" });
      getAudioTracks = async () => (audio ? [{}] : []);
    },
    canEncodeVideo: async (_codec: string, options: unknown) => {
      calls.encode = options;
      return canEncode;
    },
    Conversion: {
      init: async ({ output, video, audio: audioOptions }: { output: Output; video: unknown; audio: unknown }) => {
        calls.conversion = { video, audio: audioOptions };
        return { isValid: true, execute: async () => void (output.options.target.buffer = new ArrayBuffer(outSize)) };
      },
    },
  };
  return { load: async () => lib as never, calls };
}

const blob = (size: number) => new Blob([new Uint8Array(size)], { type: "video/mp4" });
const describeResult = (result: Awaited<ReturnType<typeof processVideo>>) => ("dropVideo" in result ? "drop" : { size: result.blob.size, warning: result.warning ?? null });

// UT-144（SC-LIVE-06、SC-LIVE-09）
describe("processVideo", () => {
  it("能解码且能编码 H.264 → 转码（长边 1920、6 Mbps、去音轨）", async () => {
    const { load, calls } = fakeMediabunny({});
    const result = await processVideo(blob(16_000_000), load);
    expect({ result: describeResult(result), calls }).toEqual({
      result: { size: 2_000_000, warning: null },
      calls: {
        encode: { width: 1920, height: 1440, bitrate: 6_000_000 },
        conversion: { video: { codec: "avc", width: 1920, height: 1440, fit: "contain", bitrate: 6_000_000, forceTranscode: true }, audio: { discard: true } },
      },
    });
  });

  it("不能编码 H.264（或不能解码源视频）→ 只转封装去音轨，非 H.264 时返回 HEVC_KEPT；源是 H.264 时不警示", async () => {
    const noEncoder = fakeMediabunny({ canEncode: false, outSize: 3_000_000 });
    const noDecoder = fakeMediabunny({ canDecode: false, outSize: 3_000_000 });
    const avcWithAudio = fakeMediabunny({ codec: "avc", canEncode: false, outSize: 3_000_000 });
    const results = await Promise.all([noEncoder, noDecoder, avcWithAudio].map(({ load }) => processVideo(blob(5_000_000), load).then(describeResult)));
    expect({ results, remux: noEncoder.calls.conversion }).toEqual({
      results: [
        { size: 3_000_000, warning: "HEVC_KEPT" },
        { size: 3_000_000, warning: "HEVC_KEPT" },
        { size: 3_000_000, warning: null },
      ],
      remux: { video: {}, audio: { discard: true } },
    });
  });

  it("源已是无音轨的 H.264 mp4 → 原样使用，不转换", async () => {
    const { load, calls } = fakeMediabunny({ codec: "avc", audio: false });
    const input = blob(4_000_000);
    const result = await processVideo(input, load);
    expect({ same: "blob" in result && result.blob === input, converted: calls.conversion ?? null }).toEqual({ same: true, converted: null });
  });

  it("结果 10,485,760 B 保留，多 1 B → dropVideo", async () => {
    const results = await Promise.all(
      [VIDEO_MAX_BYTES, VIDEO_MAX_BYTES + 1].map((size) => processVideo(blob(size), fakeMediabunny({ codec: "avc", audio: false }).load).then(describeResult)),
    );
    expect(results).toEqual([{ size: VIDEO_MAX_BYTES, warning: null }, "drop"]);
  });
});
