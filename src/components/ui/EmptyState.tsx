// EmptyState（components.md"基础组件"，设计稿 EmptyState）：居中图标 + 标题 + 说明 + 可选操作
// 文案放在 role="status" 区域，列表变空时读屏会播报
import type { ReactNode } from "react";
import { ICONS, type IconName } from "./icons";

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const Icon = ICONS[icon];

  return (
    <div className="flex flex-col items-center gap-3.5 py-12 text-center">
      <div role="status" className="flex flex-col items-center gap-3.5">
        <Icon size={32} aria-hidden="true" className="text-ink-muted" />
        <p className="text-title font-semibold text-ink">{title}</p>
        {description && <p className="text-meta text-ink-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
