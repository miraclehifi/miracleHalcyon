// EditorTopBar（admin-post-editor.md"顶栏"）：← 文章 | 状态徽标 · 保存状态 …… 设置 | 主按钮
// 主按钮由页面传入（PublishActions）；视图切换在 Sprint 2（US-04）接入，此前固定为并排
import type { ReactNode } from "react";
import { Button } from "../../ui/Button";
import { IconButton } from "../../ui/IconButton";
import { StatusBadge, type BadgeStatus } from "../../ui/StatusBadge";

export interface EditorTopBarProps {
  status: BadgeStatus;
  saveIndicator?: ReactNode;
  settingsOpen: boolean;
  onToggleSettings(): void;
  primaryAction: ReactNode;
}

const goToList = () => window.location.assign("/admin");

export function EditorTopBar({ status, saveIndicator, settingsOpen, onToggleSettings, primaryAction }: EditorTopBarProps) {
  return (
    <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-2.5 max-md:px-2 max-md:py-1">
      <div className="flex min-w-0 items-center gap-3 max-md:gap-1">
        <span className="max-md:hidden">
          <Button variant="ghost" icon="arrow-left" onClick={goToList}>
            文章
          </Button>
        </span>
        <IconButton icon="arrow-left" size="touch" aria-label="返回文章列表" onClick={goToList} className="md:hidden" />
        <span aria-hidden="true" className="h-[18px] w-px bg-line-strong max-md:hidden" />
        <span className="max-md:hidden">
          <StatusBadge status={status} />
        </span>
        {saveIndicator}
      </div>
      <div className="flex items-center gap-2.5 max-md:gap-1">
        <span className="max-md:hidden">
          <Button variant="secondary" icon="settings-2" aria-pressed={settingsOpen} aria-controls="post-settings" onClick={onToggleSettings}>
            设置
          </Button>
        </span>
        <IconButton
          icon="settings-2"
          size="touch"
          aria-label="文章设置"
          aria-pressed={settingsOpen}
          aria-controls="post-settings"
          onClick={onToggleSettings}
          className="md:hidden"
        />
        {primaryAction}
      </div>
    </header>
  );
}
