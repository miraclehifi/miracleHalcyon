// 书影音条目列表主体（admin-media.md §一，US-01）：标题行（计数 + 新增条目）、分类导航（由页面以 tabs 传入）、条目行、空状态。
// 隐藏 / 取消隐藏：请求中按钮禁用，成功后原位切换徽标；删除：确认框 → 成功后移除该行。结果用轻提示；计数随操作更新
import { useEffect, useState, type ReactNode } from "react";
import { countLabel, TYPE_LABELS, type ShelfType } from "../../../domains/shelf/entry";
import { takeFlash } from "../../../lib/admin/flash";
import { deleteEntry, setEntryHidden, type ShelfCounts, type ShelfEntryView } from "../../../lib/admin/shelf-client";
import { Button } from "../../ui/Button";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { EmptyState } from "../../ui/EmptyState";
import type { IconName } from "../../ui/icons";
import { ToastProvider, useToast } from "../../ui/Toast";
import { shelfPath } from "../../../lib/reader/shelf";
import { PageHeader } from "../PageHeader";
import { MediaEntryRow } from "./MediaEntryRow";

export const EMPTY_ICONS: Record<ShelfType, IconName> = {
  book: "book-open",
  comic: "book-image",
  movie: "film",
  series: "tv",
  game: "gamepad-2",
  boardgame: "dices",
};

export interface MediaEntryListProps {
  type: ShelfType;
  entries: ShelfEntryView[];
  counts: ShelfCounts;
  tabs?: ReactNode; // MediaTypeTabs 岛（页面传入）
}

export function headerMeta(type: ShelfType, counts: ShelfCounts): string {
  const base = countLabel(type, counts.total, counts.inProgress);
  return counts.hidden > 0 ? `${base} · 已隐藏 ${counts.hidden}` : base;
}

function ListContent({ type, entries: initial, counts: initialCounts, tabs }: MediaEntryListProps) {
  const [entries, setEntries] = useState(initial);
  const [counts, setCounts] = useState(initialCounts);
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ShelfEntryView | null>(null);
  const [deleteTrigger, setDeleteTrigger] = useState<HTMLElement | null>(null);
  const toast = useToast();
  const newHref = `/admin/media/new?type=${type}`;

  // 录入 / 编辑页保存或删除后整页跳回，带一条跨页提示
  useEffect(() => {
    const flash = takeFlash();
    if (flash) toast.show(flash);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 只在挂载时取一次
  }, []);

  async function toggleHidden(entry: ShelfEntryView) {
    setBusy(entry.id);
    try {
      const updated = await setEntryHidden(entry.id, !entry.hidden);
      setEntries((list) => list.map((e) => (e.id === entry.id ? updated : e)));
      if (updated.hidden !== entry.hidden) {
        const delta = updated.hidden ? 1 : -1;
        setCounts((c) => ({
          total: c.total - delta,
          inProgress: c.inProgress - (entry.status === "in_progress" ? delta : 0),
          hidden: c.hidden + delta,
        }));
      }
      toast.show({ tone: "success", message: updated.hidden ? `已隐藏《${entry.title}》，读者页将在重建后更新` : `已恢复显示《${entry.title}》` });
    } catch {
      toast.show({ tone: "error", message: "操作失败，请重试" });
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    const entry = pendingDelete;
    if (!entry) return;
    try {
      await deleteEntry(entry.id);
      setEntries((list) => list.filter((e) => e.id !== entry.id));
      setCounts((c) =>
        entry.hidden ? { ...c, hidden: c.hidden - 1 } : { ...c, total: c.total - 1, inProgress: c.inProgress - (entry.status === "in_progress" ? 1 : 0) },
      );
      setDeleteTrigger(null);
      setPendingDelete(null);
      toast.show({ tone: "success", message: `已删除《${entry.title}》` });
    } catch {
      setPendingDelete(null);
      toast.show({ tone: "error", message: "删除失败，请重试" });
    }
  }

  function cancelDelete() {
    setPendingDelete(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-[896px] flex-col gap-5 pt-12 pb-20 max-md:gap-4 max-md:px-4 max-md:pt-6 max-md:pb-8">
      <PageHeader
        title="书影音"
        stacked
        meta={
          <>
            <span>{headerMeta(type, counts)}</span>
            <span className="ml-4">
              读者页：
              <a href={shelfPath(type)} target="_blank" rel="noopener noreferrer" className="font-mono hover:text-ink hover:underline">
                {shelfPath(type)}
              </a>
            </span>
          </>
        }
        action={
          <Button variant="primary" onClick={() => window.location.assign(newHref)}>
            <span className="max-md:hidden">新增条目</span>
            <span className="md:hidden">新增</span>
          </Button>
        }
      />
      {tabs}
      {entries.length === 0 ? (
        <EmptyState
          icon={EMPTY_ICONS[type]}
          title={`还没有${TYPE_LABELS[type]}条目`}
          description="粘贴豆瓣链接，几秒录好一条"
          action={
            <Button variant="primary" onClick={() => window.location.assign(newHref)}>
              新增条目
            </Button>
          }
        />
      ) : (
        <ul aria-label={`${TYPE_LABELS[type]}条目`} className="border-t border-line">
          {entries.map((entry) => (
            <MediaEntryRow
              key={entry.id}
              entry={entry}
              busy={busy === entry.id}
              onToggleHidden={(e) => void toggleHidden(e)}
              onDelete={(e, trigger) => {
                setDeleteTrigger(trigger);
                setPendingDelete(e);
              }}
            />
          ))}
        </ul>
      )}
      <p className="text-caption text-ink-faint">进行中的条目置顶，其余按标记日期倒序。隐藏的条目只在后台显示。</p>
      <ConfirmDialog
        open={pendingDelete !== null}
        tone="danger"
        icon="trash-2"
        title={`删除「${pendingDelete?.title ?? ""}」？`}
        description="此操作不可撤销，封面一并删除。读者页将在重建后不再显示。"
        confirmLabel="删除"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        returnFocus={deleteTrigger}
      />
    </main>
  );
}

export function MediaEntryList(props: MediaEntryListProps) {
  return (
    <ToastProvider>
      <ListContent {...props} />
    </ToastProvider>
  );
}
