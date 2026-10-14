// EditorToolbar（components.md，admin-post-editor.md"工具栏与悬停提示"，US-10）：8 个格式按钮 + 竖线 + 插入图片
// 按下时阻止默认行为，源码区不失焦、选区保留（手机上键盘不收起）；手机隐藏斜体、任务列表，可点区域 44px
import type { MouseEvent } from "react";
import type { FormatCommand } from "../../../lib/editor/format-commands";
import { IconButton } from "../../ui/IconButton";
import type { IconName } from "../../ui/icons";

interface ToolbarButton {
  command: FormatCommand;
  label: string;
  icon: IconName;
  mobile: boolean;
}

export const TOOLBAR_BUTTONS: readonly ToolbarButton[] = [
  { command: "heading2", label: "二级标题", icon: "heading-2", mobile: true },
  { command: "bold", label: "加粗", icon: "bold", mobile: true },
  { command: "italic", label: "斜体", icon: "italic", mobile: false },
  { command: "link", label: "链接", icon: "link", mobile: true },
  { command: "code", label: "行内代码", icon: "code", mobile: true },
  { command: "list", label: "列表", icon: "list", mobile: true },
  { command: "task", label: "任务列表", icon: "list-todo", mobile: false },
  { command: "quote", label: "引用", icon: "text-quote", mobile: true },
];

export interface EditorToolbarProps {
  onCommand(command: FormatCommand): void;
  onInsertImage?: () => void; // 图片上传接入前不传，按钮禁用
}

const keepFocus = (event: MouseEvent) => event.preventDefault();
const BUTTON_CLASS = "max-md:size-11";

export function EditorToolbar({ onCommand, onInsertImage }: EditorToolbarProps) {
  return (
    <div role="toolbar" aria-label="格式" className="-mx-1.5 flex items-center gap-0.5">
      {TOOLBAR_BUTTONS.map(({ command, label, icon, mobile }) => (
        <IconButton
          key={command}
          icon={icon}
          aria-label={label}
          onMouseDown={keepFocus}
          onClick={() => onCommand(command)}
          className={mobile ? BUTTON_CLASS : `${BUTTON_CLASS} max-md:hidden`}
        />
      ))}
      <span aria-hidden="true" className="mx-1.5 h-4 w-px bg-line" />
      <IconButton icon="image-plus" aria-label="插入图片" onMouseDown={keepFocus} onClick={onInsertImage} disabled={!onInsertImage} className={BUTTON_CLASS} />
    </div>
  );
}
