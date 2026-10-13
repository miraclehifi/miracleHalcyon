// StatusBadge（components.md"基础组件"，design-tokens"文章状态配色"）
export type PostStatus = "draft" | "published";
export type BadgeStatus = "draft" | "published" | "modified"; // modified = 已发布 · 有未发布修改

const STATUSES: Record<BadgeStatus, { label: string; className: string; dot: string }> = {
  draft: { label: "草稿", className: "bg-surface-sunken text-ink-muted", dot: "bg-ink-muted" },
  published: { label: "已发布", className: "bg-ok-soft text-ok", dot: "bg-ok" },
  modified: { label: "已发布 · 有未发布修改", className: "bg-warn-soft text-warn", dot: "bg-warn" },
};

// 接口字段 status + hasUnpublishedChanges（post api-contract）→ 徽标状态
export function badgeStatus(status: PostStatus, hasUnpublishedChanges: boolean): BadgeStatus {
  if (status === "draft") return "draft";
  return hasUnpublishedChanges ? "modified" : "published";
}

export function StatusBadge({ status }: { status: BadgeStatus }) {
  const { label, className, dot } = STATUSES[status];

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[3px] text-caption leading-4 font-medium whitespace-nowrap ${className}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
