// Popover（components.md"基础组件"`Popover`）：非模态浮层 role="dialog"，可访问名称为标题。由使用方定位（放在 relative 容器里，
// side 决定在触发元素上方还是下方，左对齐）；打开时焦点移到标题；Esc、点外部关闭（onClose 负责把焦点还给触发元素）。
// surface 底、1px line 边、12px 圆角、阴影同弹窗；宽 360，最高 60vh，超出时内部滚动
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";

export interface PopoverProps {
  open: boolean;
  onClose(): void;
  title: string;
  side?: "top" | "bottom";
  children: ReactNode;
}

export function Popover({ open, onClose, title, side = "top", children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onCloseRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  if (!open) return null;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      className={`absolute left-0 z-30 flex max-h-[60vh] w-90 flex-col gap-3 overflow-y-auto rounded-[12px] border border-line bg-surface p-4 text-left shadow-[0_1px_2px_rgb(0_0_0/12%),0_12px_32px_rgb(0_0_0/20%)] ${side === "top" ? "bottom-full mb-2" : "top-full mt-2"}`}
    >
      <h2 ref={titleRef} id={titleId} tabIndex={-1} className="text-ui font-semibold text-ink outline-none">
        {title}
      </h2>
      {children}
    </div>
  );
}
