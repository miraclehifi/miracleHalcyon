// Tabs（components.md"基础组件"`TabItem/Selected` · `Default`）：tablist，roving tabindex，← / → 循环切换并选中
// 选中项 ink 600 + accent 2px 底线；未选中 ink-muted 400
import { createContext, useContext, useRef, type KeyboardEvent, type ReactNode } from "react";

interface TabsState {
  value: string;
  select(value: string): void;
}

const TabsContext = createContext<TabsState | null>(null);

const NEXT_KEYS: Record<string, 1 | -1> = { ArrowRight: 1, ArrowLeft: -1 };

export interface TabsProps {
  value: string;
  onChange(value: string): void;
  "aria-label": string;
  className?: string;
  children: ReactNode;
}

export function Tabs({ value, onChange, className = "", children, ...rest }: TabsProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = NEXT_KEYS[event.key];
    const tabs = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])];
    if (!step || tabs.length === 0) return;
    event.preventDefault();
    const current = tabs.findIndex((tab) => tab.dataset.value === value);
    const target = tabs[(current + step + tabs.length) % tabs.length];
    target.focus();
    onChange(target.dataset.value ?? value);
  };

  return (
    <TabsContext.Provider value={{ value, select: onChange }}>
      <div ref={ref} role="tablist" aria-label={rest["aria-label"]} onKeyDown={onKeyDown} className={`flex gap-6 border-b border-line px-4 ${className}`}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabItemProps {
  value: string;
  controls: string; // 对应面板的 id
  children: ReactNode;
}

function TabItem({ value, controls, children }: TabItemProps) {
  const tabs = useContext(TabsContext);
  if (!tabs) throw new Error("Tabs.Item 需要放在 <Tabs> 内");
  const selected = tabs.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      tabIndex={selected ? 0 : -1}
      data-value={value}
      onClick={() => tabs.select(value)}
      className={`-mb-px cursor-pointer border-b-2 px-0.5 py-3 text-ui leading-[18px] transition-colors duration-200 ease-in-out ${
        selected ? "border-accent font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

Tabs.Item = TabItem;
