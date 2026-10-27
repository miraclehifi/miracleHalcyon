// YearBadge（components.md）：游戏海报悬停时右下角的发售年份胶囊，样式同 PlatformBadge；年份已写进翻面控件的 aria-label，自身 aria-hidden
export function YearBadge({ year }: { year: number }) {
  return (
    <span
      data-year-badge
      aria-hidden="true"
      className="inline-flex h-[22px] items-center rounded-full border-[0.5px] border-white/18 bg-[#171A21]/85 px-[9px] font-mono text-[11px] leading-none font-semibold text-[#E6EDF3] backdrop-blur-[8px]"
    >
      {year}
    </span>
  );
}
