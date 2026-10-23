// MediaTimeToggle/On · /Off（components.md）："按时间"开关。/On 用 accent 描边与浅底（不用反色，避免与选中的分类胶囊混淆）
import { CalendarDays } from "lucide-react";

export interface MediaTimeToggleProps {
  pressed: boolean;
  onChange(pressed: boolean): void;
}

export function MediaTimeToggle({ pressed, onChange }: MediaTimeToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-ui font-medium transition-colors duration-200 ${
        pressed ? "border-accent bg-accent-soft text-accent" : "border-line bg-bg text-ink-muted hover:text-ink"
      }`}
    >
      <CalendarDays size={16} aria-hidden="true" />
      按时间
    </button>
  );
}
