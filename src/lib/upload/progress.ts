// 上传进度（media-upload module-spec §3"进度"）：压缩 0–15、处理实况视频 15–40、上传从上一阶段终点走到 100；
// Afilmory 照片获取信息（fetching）0–90，按时间趋近，替换占位时为 100。
// 压缩与视频处理没有真实进度，按时间趋近（creep）；上传用 XHR upload.onprogress 的字节比例
export type UploadStage = "waiting" | "compressing" | "processing-live" | "fetching" | "uploading" | "done";

const COMPRESS_END = 15;
const LIVE_END = 40;
const FETCH_END = 90;
const CREEP_STEP = 0.08; // 每步走剩余区间的 8%
const CREEP_MAX = 0.99; // 阶段结束前停在终点之前

const clamp = (ratio: number) => Math.min(1, Math.max(0, ratio));
const lerp = (from: number, to: number, ratio: number) => from + (to - from) * clamp(ratio);

export function stageProgress(stage: UploadStage, ratio: number, { live }: { live: boolean }): number {
  switch (stage) {
    case "waiting":
      return 0;
    case "compressing":
      return lerp(0, COMPRESS_END, ratio);
    case "processing-live":
      return lerp(COMPRESS_END, LIVE_END, ratio);
    case "fetching":
      return lerp(0, FETCH_END, ratio);
    case "uploading":
      return lerp(live ? LIVE_END : COMPRESS_END, 100, ratio);
    case "done":
      return 100;
  }
}

export const creep = (ratio: number) => Math.min(CREEP_MAX, ratio + (1 - ratio) * CREEP_STEP);
