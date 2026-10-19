// StatCard（components.md"业务区块"，admin-storage.md"StatCard"）：标签 + 主数字 + 可选副行，不可点。
// 外框同 PostListItem（虚线 line-strong、圆角 12）；highlight 对应设计稿 /Highlight（实线 accent 边 + accent-soft 底）
export interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
  highlight?: boolean;
  loading?: boolean; // 主数字处显示骨架条
}

export function StatCard({ label, value, detail, highlight = false, loading = false }: StatCardProps) {
  const frame = highlight ? "border-solid border-accent bg-accent-soft" : "border-dashed border-line-strong bg-bg";
  return (
    <dl data-highlight={highlight || undefined} className={`flex min-h-[120px] flex-1 flex-col justify-center gap-1.5 rounded-[12px] border px-6 py-5 max-md:min-h-[96px] ${frame}`}>
      <dt className="text-ui text-ink-muted">{label}</dt>
      {loading ? (
        <dd aria-hidden="true" className="h-6 w-20 animate-pulse rounded-control bg-surface-sunken motion-reduce:animate-none" />
      ) : (
        <>
          <dd className={`text-title font-semibold tabular-nums ${highlight ? "text-accent" : "text-ink"}`}>{value}</dd>
          {detail && <dd className="text-ui text-ink-muted tabular-nums">{detail}</dd>}
        </>
      )}
    </dl>
  );
}
