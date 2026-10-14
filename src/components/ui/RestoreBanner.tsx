// RestoreBanner（components.md"反馈组件"，admin-post-editor"弹层与提示"本地内容恢复）：写文章页顶栏下方
// warn-soft 底、history 图标；"丢弃本地内容"（文字按钮）/ "恢复本地内容"（主按钮）。时间按浏览器本地时区"M月D日 HH:mm"
import { useId } from "react";
import { Button } from "./Button";
import { ICONS } from "./icons";

export interface RestoreBannerProps {
  savedAt: Date;
  onRestore(): void;
  onDiscard(): void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const formatSavedAt = (date: Date) => `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;

export function RestoreBanner({ savedAt, onRestore, onDiscard }: RestoreBannerProps) {
  const titleId = useId();
  const Icon = ICONS.history;

  return (
    <section aria-labelledby={titleId} className="flex items-center gap-3 rounded-control bg-warn-soft px-4 py-3 max-md:flex-wrap">
      <Icon size={18} aria-hidden="true" className="shrink-0 text-warn" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id={titleId} className="text-ui font-semibold text-ink">
          发现未同步的本地内容，是否恢复？
        </h2>
        <p className="text-caption text-ink-muted">本地暂存于 {formatSavedAt(savedAt)}，比服务端版本更新。丢弃后无法找回。</p>
      </div>
      <div className="flex shrink-0 items-center gap-2 max-md:ml-auto">
        <Button variant="ghost" onClick={onDiscard}>
          丢弃本地内容
        </Button>
        <Button onClick={onRestore}>恢复本地内容</Button>
      </div>
    </section>
  );
}
