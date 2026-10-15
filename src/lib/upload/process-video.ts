// 实况视频处理（media-upload module-spec §2、§3，ADR-006 第 3、5 点）：mediabunny 只在处理视频时动态 import。
// 源已是无音轨的 H.264 mp4 → 原样使用；能解码源视频且浏览器能编码 H.264 → 转码（长边 1920、6 Mbps、去音轨）；
// 否则只转封装（保留原编码、去音轨），结果不是 H.264 时返回 HEVC_KEPT（部分浏览器只显示静态图）。
// 结果超过 10MB → dropVideo（按普通图片上传）
export const VIDEO_MAX_BYTES = 10 * 1024 * 1024;
const MAX_EDGE = 1920; // 浏览器 H.264 编码器不支持 4K（OPPO 主视频 3840×2880）
const VIDEO_BITRATE = 6_000_000; // 约 0.75MB/s，3 秒片段 ≈ 2.3MB

export type ProcessedVideo = { blob: Blob; warning?: "HEVC_KEPT" } | { dropVideo: true };
export type VideoPlan = "as-is" | "transcode" | "remux";

type Mediabunny = typeof import("mediabunny");
const loadMediabunny = () => import("mediabunny");

export interface SourceVideo {
  isMp4: boolean;
  codec: string | null;
  hasAudio: boolean;
  canDecode: boolean;
  canEncodeAvc: boolean;
}

export function planVideo({ isMp4, codec, hasAudio, canDecode, canEncodeAvc }: SourceVideo): VideoPlan {
  if (isMp4 && codec === "avc" && !hasAudio) return "as-is";
  return canDecode && canEncodeAvc ? "transcode" : "remux";
}

const evenSize = (width: number, height: number) => {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height, 1));
  return { width: Math.round((width * scale) / 2) * 2, height: Math.round((height * scale) / 2) * 2 };
};

export async function processVideo(video: Blob, load: () => Promise<Mediabunny> = loadMediabunny): Promise<ProcessedVideo> {
  const lib = await load();
  const input = new lib.Input({ source: new lib.BlobSource(video), formats: lib.ALL_FORMATS });
  const track = await input.getPrimaryVideoTrack();
  if (!track) throw new Error("视频中没有画面");
  const codec = await track.getCodec();
  const size = evenSize(await track.getDisplayWidth(), await track.getDisplayHeight());
  const plan = planVideo({
    isMp4: (await input.getFormat()) === lib.MP4,
    codec,
    hasAudio: (await input.getAudioTracks()).length > 0,
    canDecode: await track.canDecode(),
    canEncodeAvc: await lib.canEncodeVideo("avc", { ...size, bitrate: VIDEO_BITRATE }),
  });

  let blob = video;
  if (plan !== "as-is") {
    const target = new lib.BufferTarget();
    const output = new lib.Output({ format: new lib.Mp4OutputFormat({ fastStart: "in-memory" }), target });
    const conversion = await lib.Conversion.init({
      input,
      output,
      video: plan === "transcode" ? { codec: "avc", ...size, fit: "contain", bitrate: VIDEO_BITRATE, forceTranscode: true } : {},
      audio: { discard: true },
      showWarnings: false,
    });
    if (!conversion.isValid) throw new Error("无法处理该视频");
    await conversion.execute();
    blob = new Blob([target.buffer!], { type: "video/mp4" });
  }
  if (blob.size > VIDEO_MAX_BYTES) return { dropVideo: true };
  return plan === "remux" && codec !== "avc" ? { blob, warning: "HEVC_KEPT" } : { blob };
}
