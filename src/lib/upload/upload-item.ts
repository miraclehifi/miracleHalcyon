// 单项上传流程（media-upload module-spec §1、§2 uploadItem）：在"处理中…"阶段先压缩静态图（compress-image.ts），
// 再基于压缩结果算主色与宽高（实况项另处理视频），
// 进入"上传中…"后上传，返回要替换占位的 Markdown 引用。实况项：静态图与视频同一请求，成功后引用追加 #live；
// 视频超过 10MB 丢弃、保留了非 H.264 编码时各给一条警示（上传成功后才提示）；任一步失败抛出，由调用方移除占位并报错，
// 不会出现只有图片或只有视频的半对
import type { ImageMeta } from "./dominant-color";
import type { ProcessedVideo, ProcessVideoOptions } from "./process-video";
import { altFromFileName, imageMarkdown, type UploadedImage, type UploadExtras, type UploadOptions } from "./upload-client";

export type UploadItem = { kind: "image"; file: File } | { kind: "live"; name: string; still: Blob; video: Blob };

export interface UploadItemDeps {
  compress?(file: File): Promise<File>; // 压缩失败时返回原文件，不抛错
  measure(file: Blob): Promise<ImageMeta | null>;
  upload(file: File, extras: UploadExtras, options?: UploadOptions): Promise<UploadedImage>;
  processVideo(video: Blob, options?: Pick<ProcessVideoOptions, "signal">): Promise<ProcessedVideo>;
}

export interface UploadItemCallbacks {
  onProcessingLive?(): void; // 开始处理实况视频（卡片阶段 15–40%）
  onUploading(): void; // 占位改为"上传中…"
  onUploadProgress?(loaded: number, total: number): void;
  onWarning(message: string): void;
}

export const LIVE_WARNINGS = {
  dropVideo: "实况视频超过 10MB，已作为普通图片插入",
  HEVC_KEPT: "该实况视频在部分浏览器中只显示静态图",
} as const;

export const itemName = (item: UploadItem) => (item.kind === "image" ? item.file.name : item.name);

export interface UploadItemOptions {
  live?: boolean; // 实况开关（任务创建时的快照）：关闭时实况项只传静态图，不处理视频、不加载 mediabunny
  signal?: AbortSignal; // "仅转为静态图"：中止视频处理，立即按静态图继续（不支持取消时忽略其结果）
}

// 视频处理与中止赛跑：中止时立即返回 null（处理结果或错误都不再理会）
function unlessAborted<T>(work: Promise<T>, signal?: AbortSignal): Promise<T | null> {
  if (!signal) return work;
  if (signal.aborted) return Promise.resolve(null);
  return new Promise<T | null>((resolve, reject) => {
    const onAbort = () => resolve(null);
    signal.addEventListener("abort", onAbort, { once: true });
    work.then(
      (value) => (signal.aborted ? resolve(null) : resolve(value)),
      (error: unknown) => (signal.aborted ? resolve(null) : reject(error)),
    ).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export async function uploadItem(
  item: UploadItem,
  deps: UploadItemDeps,
  { onProcessingLive, onUploading, onUploadProgress, onWarning }: UploadItemCallbacks,
  { live = true, signal }: UploadItemOptions = {},
): Promise<string> {
  const original = item.kind === "image" ? item.file : new File([item.still], item.name, { type: item.still.type || "image/jpeg" });
  const file = deps.compress ? await deps.compress(original) : original;
  const meta = await deps.measure(file);
  let video: Blob | undefined;
  let warning: string | undefined;
  if (item.kind === "live" && live && !signal?.aborted) {
    onProcessingLive?.();
    const processed = await unlessAborted(deps.processVideo(item.video, { signal }), signal); // null：仅转为静态图，不带视频、不警示
    if (processed && "dropVideo" in processed) warning = LIVE_WARNINGS.dropVideo;
    else if (processed) {
      video = processed.blob;
      if (processed.warning) warning = LIVE_WARNINGS[processed.warning];
    }
  }
  onUploading();
  const image = await deps.upload(file, { meta, video }, { onProgress: onUploadProgress });
  if (warning) onWarning(warning);
  return imageMarkdown(altFromFileName(file.name), image.live ? `${image.url}#live` : image.url);
}
