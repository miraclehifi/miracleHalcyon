// MediaTimeBasis（components.md）："按时间"打开后的分段依据：标记时间 / 发行年份，文案随分类。radiogroup，←→ 切换
import { useRef, type KeyboardEvent } from "react";
import { statusLabel, type ShelfType } from "../../domains/shelf/entry";

export type TimeBasis = "marked" | "release";

const RELEASE_TEXT: Record<ShelfType, string> = { book: "出版年份", comic: "出版年份", movie: "上映年份", series: "首播年份", game: "发售年份", boardgame: "发行年份" };
const BASES: readonly TimeBasis[] = ["marked", "release"];

export interface MediaTimeBasisProps {
  type: ShelfType;
  value: TimeBasis;
  onChange(value: TimeBasis): void;
}

export function MediaTimeBasis({ type, value, onChange }: MediaTimeBasisProps) {
  const ref = useRef<HTMLDivElement>(null);
  const label = (basis: TimeBasis) => (basis === "marked" ? `${statusLabel(type, "completed")}时间` : RELEASE_TEXT[type]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const next = BASES[(BASES.indexOf(value) + 1) % BASES.length]; // 只有两项，前后都是另一项
    onChange(next);
    ref.current?.querySelector<HTMLButtonElement>(`[data-value="${next}"]`)?.focus();
  };

  return (
    <div ref={ref} role="radiogroup" aria-label="分段依据" onKeyDown={onKeyDown} className="inline-flex h-[30px] shrink-0 items-center gap-0.5 rounded-control bg-surface-sunken p-[3px]">
      {BASES.map((basis) => {
        const selected = basis === value;
        return (
          <button
            key={basis}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            data-value={basis}
            onClick={() => onChange(basis)}
            className={`inline-flex h-full items-center rounded-[5px] px-2.5 text-meta whitespace-nowrap transition-colors duration-200 ${
              selected ? "bg-bg font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/10%)]" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label(basis)}
          </button>
        );
      })}
    </div>
  );
}
