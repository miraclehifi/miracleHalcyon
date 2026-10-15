// TagChip（components.md"基础组件"，设计稿 TagChip）：等宽小字标签块；传 onRemove 时带 × 删除按钮；
// 传 href 时为链接（读者端标签入口，F-002），悬停文字变深
import { ICONS } from "./icons";

export interface TagChipProps {
  label: string;
  onRemove?(): void;
  href?: string;
}

const CHIP = "inline-flex max-w-full items-center gap-1 rounded-[4px] bg-surface-sunken py-[3px] pr-1.5 pl-2 font-mono text-caption text-ink-muted";

const RemoveIcon = ICONS.x;

export function TagChip({ label, onRemove, href }: TagChipProps) {
  if (href) {
    return (
      <a href={href} className={`${CHIP} transition-colors duration-200 hover:text-ink`}>
        <span className="truncate">{label}</span>
      </a>
    );
  }
  return (
    <span className={CHIP}>
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`删除标签 ${label}`}
          onClick={onRemove}
          className="inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-[3px] text-ink-faint hover:bg-line hover:text-ink max-md:size-6"
        >
          <RemoveIcon size={12} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
