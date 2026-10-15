// 单项上传流程（media-upload module-spec §1、§2 uploadItem）：在"处理中…"阶段算主色与宽高（实况项另处理视频），
// 进入"上传中…"后上传，返回要替换占位的 Markdown 引用。实况项：静态图与视频同一请求，成功后引用追加 #live；
// 视频超过 10MB 丢弃、保留了非 H.264 编码时各给一条警示（上传成功后才提示）；任一步失败抛出，由调用方移除占位并报错，
// 不会出现只有图片或只有视频的半对
import type { ImageMeta } from "./dominant-color";
import type { ProcessedVideo } from "./process-video";
import { altFromFileName, imageMarkdown, type UploadedImage, type UploadExtras } from "./upload-client";

export type UploadItem = { kind: "image"; file: File } | { kind: "live"; name: string; still: Blob; video: Blob };

export interface UploadItemDeps {
  measure(file: Blob): Promise<ImageMeta | null>;
  upload(file: File, extras: UploadExtras): Promise<UploadedImage>;
  processVideo(video: Blob): Promise<ProcessedVideo>;
}

export interface UploadItemCallbacks {
  onUploading(): void; // 占位改为"上传中…"
  onWarning(message: string): void;
}

export const LIVE_WARNINGS = {
  dropVideo: "实况视频超过 10MB，已作为普通图片插入",
  HEVC_KEPT: "该实况视频在部分浏览器中只显示静态图",
} as const;

export const itemName = (item: UploadItem) => (item.kind === "image" ? item.file.name : item.name);

export async function uploadItem(item: UploadItem, deps: UploadItemDeps, { onUploading, onWarning }: UploadItemCallbacks): Promise<string> {
  const file = item.kind === "image" ? item.file : new File([item.still], item.name, { type: item.still.type || "image/jpeg" });
  const meta = await deps.measure(file);
  let video: Blob | undefined;
  let warning: string | undefined;
  if (item.kind === "live") {
    const processed = await deps.processVideo(item.video);
    if ("dropVideo" in processed) warning = LIVE_WARNINGS.dropVideo;
    else {
      video = processed.blob;
      if (processed.warning) warning = LIVE_WARNINGS[processed.warning];
    }
  }
  onUploading();
  const image = await deps.upload(file, { meta, video });
  if (warning) onWarning(warning);
  return imageMarkdown(altFromFileName(file.name), image.live ? `${image.url}#live` : image.url);
}
