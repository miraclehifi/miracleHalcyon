// ImageMenu（components.md `ImageMenu`，admin-post-editor"图片菜单"）：预览图片右上角的"图片选项"按钮（OverlayButton 32）+ Menu。
// 开合由使用方控制（MarkdownPreview 按图片的源码位置记住哪张图的菜单开着，改写源码、预览重新挂载后菜单仍打开）。
// 菜单在按钮下方右对齐，下方空间不够时翻到上方；滚动（滚轮 / 触摸滑动）时关闭；关闭后焦点回到按钮
import { useEffect, useRef, useState } from "react";
import { Menu } from "../../ui/Menu";
import { OverlayButton } from "../../ui/OverlayButton";

export type ImageMenuProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
} & { kind: "image"; wide: boolean; onToggleWide(): void };

const MENU_SPACE = 160; // 菜单最大高度（含间距）的估计值，用来判断是否翻到上方

export function ImageMenu({ open, onOpenChange, wide, onToggleWide }: ImageMenuProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [above, setAbove] = useState(false);
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  useEffect(() => {
    if (!open) return;
    const close = () => onOpenChangeRef.current(false);
    window.addEventListener("wheel", close, { capture: true, passive: true });
    window.addEventListener("touchmove", close, { capture: true, passive: true });
    return () => {
      window.removeEventListener("wheel", close, { capture: true });
      window.removeEventListener("touchmove", close, { capture: true });
    };
  }, [open]);

  const toggle = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!open && rect) setAbove(window.innerHeight - rect.bottom < MENU_SPACE && rect.top > MENU_SPACE);
    onOpenChange(!open);
  };
  const close = () => {
    onOpenChange(false);
    buttonRef.current?.focus();
  };

  return (
    <div className="relative">
      <OverlayButton
        ref={buttonRef}
        icon="ellipsis"
        size={32}
        aria-label="图片选项"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
        onPointerDown={(event) => event.stopPropagation()} // 不让 Menu 的"点外部关闭"先关掉，再被这次点击重新打开
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            toggle();
          }
        }}
      />
      <Menu open={open} aria-label="图片" onClose={close} className={`right-0 w-45 ${above ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}>
        <Menu.Item type="checkbox" checked={wide} onSelect={onToggleWide}>
          宽图
        </Menu.Item>
      </Menu>
    </div>
  );
}
