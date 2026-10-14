// EditorTopBar（admin-post-editor.md"顶栏"）：← 文章 | 状态徽标 · 保存状态 …… 视图切换 | 设置 | 主按钮
// 视图切换与主按钮由页面传入（宽屏 SegmentedControl、PublishActions）；窄屏视图切换是顶栏下方的 Tab，不在这里
import type { ReactNode } from "react";
import { Button } from "../../ui/Button";
import { IconButton } from "../../ui/IconButton";
import { Tooltip } from "../../ui/Tooltip";
import { StatusBadge, type BadgeStatus } from "../../ui/StatusBadge";

export interface EditorTopBarProps {
  status: BadgeStatus;
  saveIndicator?: ReactNode;
  viewSwitch?: ReactNode;
  settingsOpen: boolean;
  onToggleSettings(): void;
  primaryAction: ReactNode;
}

const goToList = () => window.location.assign("/admin");

export function EditorTopBar({ status, saveIndicator, viewSwitch, settingsOpen, onToggleSettings, primaryAction }: EditorTopBarProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5 max-md:px-2 max-md:py-1">
      <div className="flex min-w-0 items-center gap-3 max-md:gap-1">
        <span className="max-md:hidden">
          <Button variant="ghost" icon="arrow-left" onClick={goToList}>
            文章
          </Button>
        </span>
        <Tooltip content="返回文章列表" className="md:hidden">
          <IconButton icon="arrow-left" size="touch" aria-label="返回文章列表" onClick={goToList} />
        </Tooltip>
        <span aria-hidden="true" className="h-[18px] w-px bg-line-strong max-md:hidden" />
        <span className="max-md:hidden">
          <StatusBadge status={status} />
        </span>
        {saveIndicator}
      </div>
      <div className="flex items-center gap-2.5 max-md:gap-1">
        {viewSwitch}
        <span className="max-md:hidden">
          <Button variant="secondary" icon="settings-2" aria-pressed={settingsOpen} aria-controls="post-settings" onClick={onToggleSettings}>
            设置
          </Button>
        </span>
        <Tooltip content="文章设置" className="md:hidden">
          <IconButton icon="settings-2" size="touch" aria-label="文章设置" aria-pressed={settingsOpen} aria-controls="post-settings" onClick={onToggleSettings} />
        </Tooltip>
        {primaryAction}
      </div>
    </header>
  );
}
