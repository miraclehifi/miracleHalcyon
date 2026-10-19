// EditorToolbar（components.md，admin-post-editor.md"工具栏与悬停提示"，US-10）：8 个格式按钮 + 竖线 + 插入图片 + 实况照片开关
// （US-11 AC9，紧跟插入图片，手机上同样在最后）
// 按下时阻止默认行为，源码区不失焦、选区保留（手机上键盘不收起）；手机隐藏斜体、任务列表，可点区域 44px，
// 手机固定在页面底部（编辑区最后、通栏，`EditorToolbar/Mobile`；h-dvh 布局随键盘收缩，因此在键盘上方）
// 全部按钮在一个 TooltipGroup 里，提示带快捷键键帽；桌面提示在下方，手机在上方
import type { MouseEvent } from "react";
import { NARROW_QUERY, useMediaQuery } from "../../../lib/dom/media";
import type { FormatCommand } from "../../../lib/editor/format-commands";
import { IconButton } from "../../ui/IconButton";
import type { IconName } from "../../ui/icons";
import { Tooltip, TooltipGroup, type ShortcutKey } from "../../ui/Tooltip";

interface ToolbarButton {
  command: FormatCommand;
  label: string;
  icon: IconName;
  mobile: boolean;
  shortcut?: readonly ShortcutKey[]; // 与 src/lib/editor/shortcuts.ts 的映射一致
}

export const TOOLBAR_BUTTONS: readonly ToolbarButton[] = [
  { command: "heading2", label: "二级标题", icon: "heading-2", mobile: true },
  { command: "bold", label: "加粗", icon: "bold", mobile: true, shortcut: ["Mod", "B"] },
  { command: "italic", label: "斜体", icon: "italic", mobile: false, shortcut: ["Mod", "I"] },
  { command: "link", label: "链接", icon: "link", mobile: true, shortcut: ["Mod", "K"] },
  { command: "code", label: "行内代码", icon: "code", mobile: true, shortcut: ["Mod", "E"] },
  { command: "list", label: "列表", icon: "list", mobile: true, shortcut: ["Mod", "Shift", "8"] },
  { command: "task", label: "任务列表", icon: "list-todo", mobile: false },
  { command: "quote", label: "引用", icon: "text-quote", mobile: true, shortcut: ["Mod", "Shift", "."] },
];

export interface EditorToolbarProps {
  onCommand(command: FormatCommand): void;
  onInsertImage?: () => void; // 图片上传接入前不传，按钮禁用
  live?: boolean; // 实况照片开关（不传 onLiveChange 时不显示）
  onLiveChange?: (live: boolean) => void;
}

const keepFocus = (event: MouseEvent) => event.preventDefault();
const BUTTON_CLASS = "max-md:size-11";

export function EditorToolbar({ onCommand, onInsertImage, live = false, onLiveChange }: EditorToolbarProps) {
  const side = useMediaQuery(NARROW_QUERY) ? "top" : "bottom";
  return (
    <div
      role="toolbar"
      aria-label="格式"
      className="-mx-1.5 flex items-center gap-0.5 max-md:order-last max-md:-mx-4 max-md:justify-between max-md:border-t max-md:border-line max-md:bg-surface max-md:px-1"
    >
      <TooltipGroup>
        {TOOLBAR_BUTTONS.map(({ command, label, icon, mobile, shortcut }) => (
          <Tooltip key={command} content={label} shortcut={shortcut} side={side} className={mobile ? undefined : "max-md:hidden"}>
            <IconButton icon={icon} aria-label={label} onMouseDown={keepFocus} onClick={() => onCommand(command)} className={BUTTON_CLASS} />
          </Tooltip>
        ))}
        <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-line max-md:hidden" />
        <Tooltip content="插入图片" side={side}>
          <IconButton icon="image-plus" aria-label="插入图片" onMouseDown={keepFocus} onClick={onInsertImage} disabled={!onInsertImage} className={BUTTON_CLASS} />
        </Tooltip>
        {onLiveChange && (
          <Tooltip content="实况照片" side={side}>
            <IconButton icon="circle-dot-dashed" aria-label="实况照片" checked={live} onMouseDown={keepFocus} onClick={() => onLiveChange(!live)} className={BUTTON_CLASS} />
          </Tooltip>
        )}
      </TooltipGroup>
    </div>
  );
}
