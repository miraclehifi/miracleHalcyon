// LiveBadge（components.md"文章图片"）：实况照片标记。图标 + LIVE，overlay 底 + 背景模糊；播放中换成 overlay-ink 底
import { CircleDot, CircleDotDashed } from "lucide-react";

export interface LiveBadgeProps {
  playing?: boolean;
}

export function LiveBadge({ playing = false }: LiveBadgeProps) {
  const Icon = playing ? CircleDot : CircleDotDashed;
  return (
    <span
      data-live-badge=""
      data-playing={playing ? "" : undefined}
      className="inline-flex items-center gap-1 rounded-full bg-overlay py-1 pr-[9px] pl-[7px] text-overlay-ink backdrop-blur-[12px] transition-colors duration-200 data-[playing]:bg-overlay-ink data-[playing]:text-overlay-ink-inverse"
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="font-mono text-[12px] leading-4 font-semibold tracking-[1px]">LIVE</span>
    </span>
  );
}
