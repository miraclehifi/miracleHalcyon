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
function fakeMediabunny({ isMp4 = true, codec = "hevc", audio = true, canDecode = true, canEncode = true, outSize = 2_000_000, hang = false }: Source & { hang?: boolean }) {
  const calls: { encode?: unknown; conversion?: { video: unknown; audio: unknown }; canceled?: boolean } = {};
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
        let cancel!: () => void;
        const canceled = new Promise<void>((resolve) => (cancel = resolve));
        return {
          isValid: true,
          // hang：转换一直进行，直到 cancel()（mediabunny 取消时 execute 以错误结束）
          execute: async () => {
            if (hang) {
              await canceled;
              throw new Error("Conversion was canceled.");
            }
            output.options.target.buffer = new ArrayBuffer(outSize);
          },
          cancel: async () => {
            calls.canceled = true;
            cancel();
          },
        };
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
    const result = await processVideo(blob(16_000_000), { load });
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
    const results = await Promise.all([noEncoder, noDecoder, avcWithAudio].map(({ load }) => processVideo(blob(5_000_000), { load }).then(describeResult)));
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
    const result = await processVideo(input, { load });
    expect({ same: "blob" in result && result.blob === input, converted: calls.conversion ?? null }).toEqual({ same: true, converted: null });
  });

  it("结果 10,485,760 B 保留，多 1 B → dropVideo", async () => {
    const results = await Promise.all(
      [VIDEO_MAX_BYTES, VIDEO_MAX_BYTES + 1].map((size) => processVideo(blob(size), { load: fakeMediabunny({ codec: "avc", audio: false }).load }).then(describeResult)),
    );
    expect(results).toEqual([{ size: VIDEO_MAX_BYTES, warning: null }, "drop"]);
  });

  // UT-161 stillOnly（SC-LIVE-16）：中止后取消转换，以 AbortError 结束，不再产出结果；开始前已中止则不加载 mediabunny
  it("signal 中止：取消进行中的转换并以 AbortError 结束；已中止时直接结束", async () => {
    const { load, calls } = fakeMediabunny({ hang: true });
    const controller = new AbortController();
    const running = processVideo(blob(16_000_000), { load, signal: controller.signal });
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();
    const error = await running.catch((e: unknown) => e);
    let loaded = false;
    const early = await processVideo(blob(1), {
      load: async () => {
        loaded = true;
        return fakeMediabunny({}).load();
      },
      signal: AbortSignal.abort(),
    }).catch((e: unknown) => e);
    expect({ name: (error as Error).name, canceled: calls.canceled, earlyName: (early as Error).name, loaded }).toEqual({ name: "AbortError", canceled: true, earlyName: "AbortError", loaded: false });
  });
});
