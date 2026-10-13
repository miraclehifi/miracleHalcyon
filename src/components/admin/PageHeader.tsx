// PageHeader（components.md，设计稿 02 / 02m）：页面标题行——大标题 + 辅助信息，右侧放主操作
import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  meta?: ReactNode; // 标题右侧的辅助信息，如"共 N 篇"
  action?: ReactNode;
}

export function PageHeader({ title, meta, action }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="flex min-w-0 items-end gap-3">
        <h1 className="text-display font-semibold text-ink">{title}</h1>
        {meta && <span className="pb-1.5 text-meta text-ink-muted tabular-nums">{meta}</span>}
      </div>
      {action}
    </div>
  );
}
