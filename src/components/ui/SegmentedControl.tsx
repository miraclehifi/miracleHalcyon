// SegmentedControl（components.md"基础组件"）：单选组（radiogroup），roving tabindex，← / → 循环切换
import { createContext, useContext, useRef, type KeyboardEvent, type ReactNode } from "react";
import { ICONS, type IconName } from "./icons";

interface GroupState {
  value: string;
  select(value: string): void;
}

const GroupContext = createContext<GroupState | null>(null);

const NEXT_KEYS: Record<string, 1 | -1> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

export interface SegmentedControlProps {
  value: string;
  onChange(value: string): void;
  "aria-label": string;
  children: ReactNode;
}

export function SegmentedControl({ value, onChange, children, ...rest }: SegmentedControlProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = NEXT_KEYS[event.key];
    const radios = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]') ?? [])];
    if (!step || radios.length === 0) return;
    event.preventDefault();
    const current = radios.findIndex((radio) => radio.dataset.value === value);
    const target = radios[(current + step + radios.length) % radios.length];
    target.focus();
    onChange(target.dataset.value ?? value);
  };

  return (
    <GroupContext.Provider value={{ value, select: onChange }}>
      <div
        ref={ref}
        role="radiogroup"
        aria-label={rest["aria-label"]}
        onKeyDown={onKeyDown}
        className="inline-flex items-center gap-0.5 rounded-control bg-surface-sunken p-[3px]"
      >
        {children}
      </div>
    </GroupContext.Provider>
  );
}

export interface SegmentedItemProps {
  value: string;
  icon?: IconName;
  count?: number;
  children: ReactNode;
}

function SegmentedItem({ value, icon, count, children }: SegmentedItemProps) {
  const group = useContext(GroupContext);
  if (!group) throw new Error("SegmentedControl.Item 需要放在 <SegmentedControl> 内");
  const selected = group.value === value;
  const Icon = icon ? ICONS[icon] : null;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      data-value={value}
      onClick={() => group.select(value)}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[5px] px-3.5 py-1.5 text-meta leading-[17px] transition-colors duration-200 ease-in-out ${
        selected ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgb(42_37_31/8%)]" : "text-ink-muted hover:text-ink"
      }`}
    >
      {Icon && <Icon size={14} aria-hidden="true" />}
      <span>{children}</span>
      {count !== undefined && <span className="text-caption text-ink-faint tabular-nums">{count}</span>}
    </button>
  );
}

SegmentedControl.Item = SegmentedItem;
