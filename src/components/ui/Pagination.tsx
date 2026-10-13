// Pagination（components.md"基础组件"，设计稿 Pagination）：左侧范围"第 a–b 篇，共 N 篇"，右侧上一页 / 页码 / 下一页
// 页码是真实链接（可新标签打开、无 JS 可用）；onNavigate 存在时拦截普通点击走客户端加载。只有 1 页时不渲染
import type { MouseEvent, ReactNode } from "react";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  href(page: number): string;
  onNavigate?(page: number): void;
}

export function getPageCount(total: number, pageSize: number): number {
  return Math.ceil(total / pageSize);
}

const ITEM = "inline-flex items-center justify-center rounded-control px-2.5 py-[5px] text-meta tabular-nums max-md:min-h-11 max-md:min-w-11";

export function Pagination({ page, pageSize, total, href, onNavigate }: PaginationProps) {
  const pageCount = getPageCount(total, pageSize);
  if (pageCount <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const go = (target: number) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!onNavigate || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onNavigate(target);
  };

  const step = (target: number, label: ReactNode) =>
    target < 1 || target > pageCount ? (
      <span aria-disabled="true" className={`${ITEM} text-ink-faint`}>
        {label}
      </span>
    ) : (
      <a href={href(target)} onClick={go(target)} className={`${ITEM} text-ink-muted hover:bg-surface-sunken hover:text-ink`}>
        {label}
      </a>
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-meta text-ink-muted tabular-nums">
        第 {start}–{end} 篇，共 {total} 篇
      </p>
      <nav aria-label="分页" className="flex flex-wrap items-center gap-1">
        {step(page - 1, "上一页")}
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((target) =>
          target === page ? (
            <a key={target} href={href(target)} aria-current="page" onClick={go(target)} className={`${ITEM} bg-ink text-bg`}>
              {target}
            </a>
          ) : (
            <a key={target} href={href(target)} onClick={go(target)} className={`${ITEM} text-ink-muted hover:bg-surface-sunken hover:text-ink`}>
              {target}
            </a>
          ),
        )}
        {step(page + 1, "下一页")}
      </nav>
    </div>
  );
}
