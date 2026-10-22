// PageHeader（components.md，设计稿 02 / 02m / 10）：页面标题行——大标题 + 辅助信息，右侧放主操作
import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  meta?: ReactNode; // 辅助信息，如"共 N 篇"
  action?: ReactNode;
  stacked?: boolean; // 辅助信息放在标题下方一行（12px ink-faint，设计稿 10）；默认在标题右侧
}

export function PageHeader({ title, meta, action, stacked = false }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className={stacked ? "flex min-w-0 flex-col gap-2" : "flex min-w-0 items-end gap-3"}>
        <h1 className="text-display font-semibold text-ink">{title}</h1>
        {meta &&
          (stacked ? (
            <p className="text-caption text-ink-faint tabular-nums">{meta}</p>
          ) : (
            <span className="pb-1.5 text-meta text-ink-muted tabular-nums">{meta}</span>
          ))}
      </div>
      {action}
    </div>
  );
}
