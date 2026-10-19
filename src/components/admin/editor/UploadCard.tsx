// UploadCard（components.md"业务区块"，admin-post-editor"上传进度卡片"）：预览区里一张图片上传的进度卡片。
// 缩略图（blob URL，半透明 + 模糊）铺底，底部状态栏显示阶段、文件名与进度条。阶段名放在 aria-live 区域，
// 只在阶段切换时播报，百分比不进播报。成功后 leaving 淡出（减弱动效时不过渡），由使用方随后换成正式图片。
// 失败（error）：红框、缩略图更淡，状态栏显示原因，中部"重试""移除"，不再弹 Toast。
// 已中断（interrupted）：占位没有对应的上传任务（刷新后、撤销"移除"后），只有"移除"
import { useState } from "react";
import { Button } from "../../ui/Button";
import { ICONS, type IconName } from "../../ui/icons";

export type UploadCardState = "waiting" | "compressing" | "processing-live" | "uploading" | "error" | "interrupted";

export interface UploadCardProps {
  state: UploadCardState;
  fileName: string;
  thumbUrl?: string;
  progress: number; // 0–100
  error?: string; // 失败原因（state = error）
  leaving?: boolean;
  onRetry?(): void;
  onRemove(): void;
  onStillOnly?(): void; // 处理实况视频阶段显示"仅转为静态图"
}

const STAGES: Record<Exclude<UploadCardState, "error" | "interrupted">, { label: string; icon: IconName }> = {
  waiting: { label: "等待中…", icon: "loader-circle" },
  compressing: { label: "正在压缩…", icon: "loader-circle" },
  "processing-live": { label: "正在处理实况视频…", icon: "loader-circle" },
  uploading: { label: "正在上传…", icon: "cloud-upload" },
};

const DEFAULT_HEIGHT = 160; // 缩略图尺寸未知时的高度；有了比例后限制在 160–320px

export function UploadCard(props: UploadCardProps) {
  return props.state === "interrupted" ? <InterruptedCard onRemove={props.onRemove} /> : <ProgressCard {...props} />;
}

function InterruptedCard({ onRemove }: Pick<UploadCardProps, "onRemove">) {
  const Icon = ICONS["image-off"];
  return (
    <div
      role="group"
      aria-label="上传已中断"
      data-testid="upload-card"
      data-state="interrupted"
      className="upload-card not-prose my-3 flex h-[120px] w-full items-center justify-center gap-3 rounded-control border border-line-strong bg-surface-sunken"
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 text-ink-muted" />
      <span aria-live="polite" className="text-caption font-medium text-ink-muted">
        上传已中断
      </span>
      <Button variant="ghost" icon="x" onClick={onRemove}>
        移除
      </Button>
    </div>
  );
}

function ProgressCard({ state, fileName, thumbUrl, progress, error, leaving = false, onRetry, onRemove, onStillOnly }: UploadCardProps) {
  const [ratio, setRatio] = useState<number | null>(null);
  const failed = state === "error";
  const { label, icon } = failed ? { label: error ?? "上传失败，请重试", icon: "circle-alert" as const } : STAGES[state as keyof typeof STAGES];
  const Icon = ICONS[icon];
  const percent = Math.round(Math.min(100, Math.max(0, progress)));
  return (
    <div
      role="group"
      aria-label={fileName}
      data-testid="upload-card"
      data-state={state}
      className={`upload-card not-prose relative my-3 w-full overflow-hidden rounded-control bg-surface-sunken transition-opacity duration-200 motion-reduce:transition-none ${
        failed ? "border-[1.5px] border-danger" : "border border-line"
      } ${leaving ? "opacity-0" : "opacity-100"}`}
      style={ratio ? { aspectRatio: String(ratio), minHeight: 160, maxHeight: 320 } : { height: DEFAULT_HEIGHT }}
    >
      {thumbUrl && (
        <img
          src={thumbUrl}
          alt=""
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full scale-105 object-cover blur-[6px] ${failed ? "opacity-30" : "opacity-50"}`}
          onLoad={(event) => {
            const { naturalWidth, naturalHeight } = event.currentTarget;
            if (naturalWidth > 0 && naturalHeight > 0) setRatio(naturalWidth / naturalHeight);
          }}
        />
      )}
      {state === "processing-live" && onStillOnly && (
        <div className="absolute top-3 right-3">
          <Button variant="ghost" icon="image" onClick={onStillOnly}>
            仅转为静态图
          </Button>
        </div>
      )}
      {failed && (
        <div className="absolute inset-x-0 top-0 bottom-9 flex items-center justify-center gap-2">
          {onRetry && (
            <Button variant="secondary" icon="rotate-ccw" onClick={onRetry}>
              重试
            </Button>
          )}
          <Button variant="ghost" icon="x" onClick={onRemove}>
            移除
          </Button>
        </div>
      )}
      <div className={`absolute inset-x-0 bottom-0 border-t px-3 py-2.5 ${failed ? "border-danger bg-danger-soft" : "border-line bg-surface"}`}>
        <div className="flex items-center gap-1.5 text-caption">
          <Icon aria-hidden="true" className={`size-3.5 shrink-0 ${failed ? "text-danger" : state === "uploading" ? "text-accent" : "text-ink-muted motion-safe:animate-spin"}`} />
          <span className={`font-medium ${failed ? "text-danger" : "text-ink"}`}>
            <span aria-live="polite" className={failed ? "text-danger" : undefined}>
              {label}
            </span>
            {state === "uploading" && <span aria-hidden="true"> {percent}%</span>}
          </span>
          <span className="min-w-0 flex-1" />
          <span className="min-w-0 truncate font-mono text-ink-faint">{fileName}</span>
        </div>
        {!failed && (
          <div
            role="progressbar"
            aria-label={`${fileName} 上传进度`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-2 h-[3px] overflow-hidden rounded-full bg-line"
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-150 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
