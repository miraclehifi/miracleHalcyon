// ImageMenu（components.md `ImageMenu` · `/Gallery` · `/Mobile`，admin-post-editor"图片菜单"）：预览图片右上角的选项按钮
// （OverlayButton 32，手机 44）+ Menu。单图："宽图"（checkbox）；组图："网格 / 手风琴"（radio）→ 分隔线 →"拆成单图"，
// 张数不在 3–7 时"手风琴" aria-disabled 并提示原因。开合由使用方控制（MarkdownPreview 按图片的源码位置记住哪个菜单开着，
// 改写源码、预览重新挂载后菜单仍打开并停在 initialFocus 项）。菜单在按钮下方右对齐，下方空间不够时翻到上方；
// 滚动（滚轮 / 触摸滑动）时关闭；关闭后焦点回到按钮
import { useEffect, useRef, useState } from "react";
import { NARROW_QUERY, useMediaQuery } from "../../../lib/dom/media";
import { Menu } from "../../ui/Menu";
import { OverlayButton } from "../../ui/OverlayButton";
import { Tooltip } from "../../ui/Tooltip";

export const ACCORDION_RANGE = { min: 3, max: 7 };
const ACCORDION_HINT = "手风琴需要 3–7 张图片";

type ImageMenuKind =
  | { kind: "image"; wide: boolean; onToggleWide(): void }
  | { kind: "gallery"; mode: "grid" | "accordion"; count: number; onModeChange(mode: "grid" | "accordion"): void; onSplit(): void };

export type ImageMenuProps = {
  open: boolean;
  onOpenChange(open: boolean): void;
  initialFocus?: number;
} & ImageMenuKind;

const MENU_SPACE = 160; // 菜单最大高度（含间距）的估计值，用来判断是否翻到上方

export function ImageMenu(props: ImageMenuProps) {
  const { open, onOpenChange, initialFocus } = props;
  const narrow = useMediaQuery(NARROW_QUERY);
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
  const label = props.kind === "image" ? "图片" : "组图";

  return (
    <div className="relative">
      <OverlayButton
        ref={buttonRef}
        icon="ellipsis"
        size={narrow ? 44 : 32}
        aria-label={`${label}选项`}
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
      <Menu
        open={open}
        aria-label={label}
        onClose={close}
        initialFocus={initialFocus}
        className={`right-0 w-45 ${above ? "bottom-full mb-1.5" : "top-full mt-1.5"}`}
      >
        {props.kind === "image" ? (
          <Menu.Item type="checkbox" checked={props.wide} onSelect={props.onToggleWide}>
            宽图
          </Menu.Item>
        ) : (
          <GalleryItems {...props} />
        )}
      </Menu>
    </div>
  );
}

function GalleryItems({ mode, count, onModeChange, onSplit }: Extract<ImageMenuKind, { kind: "gallery" }>) {
  const accordionOk = count >= ACCORDION_RANGE.min && count <= ACCORDION_RANGE.max;
  const accordion = (
    <Menu.Item type="radio" checked={mode === "accordion"} disabled={!accordionOk} onSelect={() => onModeChange("accordion")}>
      手风琴
    </Menu.Item>
  );
  return (
    <>
      <Menu.Item type="radio" checked={mode === "grid"} onSelect={() => onModeChange("grid")}>
        网格
      </Menu.Item>
      {accordionOk ? (
        accordion
      ) : (
        <Tooltip content={ACCORDION_HINT} className="flex w-full">
          {accordion}
        </Tooltip>
      )}
      <Menu.Separator />
      <Menu.Item onSelect={onSplit}>拆成单图</Menu.Item>
    </>
  );
}
