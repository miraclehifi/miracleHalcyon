// Menu（components.md"基础组件"`Menu` · `MenuItem/Default` · `/Checked` · `/Disabled`）：弹出菜单，由使用方定位（放在
// relative 容器里，默认在触发按钮下方右对齐）。打开时焦点到第一项；↑ ↓ 循环、Home / End；Esc、Tab、点外部关闭（onClose 负责
// 把焦点还给触发按钮）。禁用项用 aria-disabled，仍可聚焦。action 项执行后关闭菜单；checkbox / radio 项执行后保持打开
// （ImageMenu：可以连续调整），选中时右侧显示 ✓
import { Check } from "lucide-react";
import { createContext, useContext, useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";

const MenuContext = createContext<{ close(): void } | null>(null);

export interface MenuProps {
  open: boolean;
  onClose(): void;
  "aria-label": string;
  className?: string; // 定位，默认 top-full right-0 mt-1.5
  initialFocus?: number; // 打开时聚焦的项（默认第一项）；菜单因改写重新挂载时用来停在原项
  children: ReactNode;
}

const ITEM_ROLES = { action: "menuitem", checkbox: "menuitemcheckbox", radio: "menuitemradio" } as const;
const items = (menu: HTMLElement | null) => [...(menu?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];

export function Menu({ open, onClose, className = "top-full right-0 mt-1.5", initialFocus = 0, children, ...rest }: MenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const list = items(ref.current);
    (list[initialFocus] ?? list[0])?.focus();
    // 点外部关闭：触发按钮自己的 click 负责开合，这里只看菜单外的按下
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onCloseRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- 只在打开时定位焦点，initialFocus 之后变化不再移动焦点

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items(ref.current);
    const index = list.indexOf(document.activeElement as HTMLElement);
    const target = {
      ArrowDown: list[(index + 1) % list.length],
      ArrowUp: list[(index - 1 + list.length) % list.length],
      Home: list[0],
      End: list[list.length - 1],
    }[event.key];
    if (target) {
      event.preventDefault();
      target.focus();
    } else if ((event.key === "Enter" || event.key === " ") && index >= 0) {
      event.preventDefault(); // 统一由这里触发，避免浏览器再把按键转成 click
      list[index].click();
    } else if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      onClose();
    }
  };

  if (!open) return null;
  return (
    <MenuContext.Provider value={{ close: onClose }}>
      <div
        ref={ref}
        role="menu"
        aria-label={rest["aria-label"]}
        onKeyDown={onKeyDown}
        className={`absolute z-30 flex min-w-40 flex-col rounded-control border border-line bg-surface p-1 shadow-[0_1px_2px_rgb(0_0_0/12%),0_8px_16px_rgb(0_0_0/25%)] ${className}`}
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export interface MenuItemProps {
  onSelect(): void;
  type?: keyof typeof ITEM_ROLES; // action（默认）/ checkbox / radio
  checked?: boolean; // checkbox / radio
  disabled?: boolean;
  "aria-describedby"?: string; // 包在 Tooltip 里时由 Tooltip 注入（禁用原因）
  children: ReactNode;
}

function MenuItem({ onSelect, type = "action", checked = false, disabled = false, children, ...rest }: MenuItemProps) {
  const menu = useContext(MenuContext);
  if (!menu) throw new Error("Menu.Item 需要放在 <Menu> 内");
  const select = () => {
    if (disabled) return;
    if (type === "action") menu.close();
    onSelect();
  };

  return (
    <button
      type="button"
      role={ITEM_ROLES[type]}
      tabIndex={-1}
      aria-checked={type === "action" ? undefined : checked}
      aria-disabled={disabled || undefined}
      aria-describedby={rest["aria-describedby"]}
      onClick={select}
      className="flex h-8 w-full cursor-pointer items-center justify-between gap-3 rounded-[6px] px-3 text-left text-ui text-ink outline-none hover:bg-surface-sunken focus-visible:bg-surface-sunken aria-disabled:cursor-default aria-disabled:text-ink-faint aria-disabled:hover:bg-transparent max-md:h-11"
    >
      {children}
      {checked && <Check size={16} aria-hidden="true" className="shrink-0 text-ink-muted" />}
    </button>
  );
}

function MenuSeparator() {
  return <div role="separator" className="mx-0 my-1 h-px bg-line" />;
}

Menu.Item = MenuItem;
Menu.Separator = MenuSeparator;
