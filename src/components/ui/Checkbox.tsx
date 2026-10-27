// Checkbox（components.md"表单与导航"）：原生 checkbox + label，点标签也能切换；方框 16×16、圆角 4，选中 accent 底白色对勾；
// hint 为标签后的 12px 小字（如上次同步时间）；禁用整体 50% 不透明；手机可点区域高 44px
import { ICONS } from "./icons";

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange(checked: boolean): void;
  hint?: string;
  disabled?: boolean;
}

const Check = ICONS.check;

export function Checkbox({ label, checked, onChange, hint, disabled = false }: CheckboxProps) {
  return (
    <label className={`inline-flex min-w-0 items-center gap-2 max-md:min-h-11 ${disabled ? "cursor-default opacity-50" : "cursor-pointer"}`}>
      <span className="relative inline-flex size-4 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer size-4 cursor-[inherit] appearance-none rounded-[4px] border border-input-border bg-surface checked:border-accent checked:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        />
        <Check size={12} strokeWidth={3} aria-hidden="true" className="pointer-events-none absolute inset-0 m-auto hidden text-white peer-checked:block" />
      </span>
      <span className="text-ui text-ink">{label}</span>
      {hint && <span className="truncate text-caption text-ink-faint">{hint}</span>}
    </label>
  );
}
