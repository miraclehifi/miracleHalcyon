// 从豆瓣导入（admin-media.md"从豆瓣导入"，components.md DoubanImportDialog，设计稿 11i，US-04）：
// 打开时读同步状态带出 ID 与各类别上次同步；按勾选类别的导入计划逐页调用导入接口，第 2 页起带回第 1 页的 head；
// 停止在当前页返回后生效；结束（完成 / 停止 / 出错）有变更时调用 finish 一次触发重建；进行中不可关闭
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { ImportStep } from "../../../domains/shelf/douban/import";
import { TYPE_LABELS, type ShelfType } from "../../../domains/shelf/entry";
import type { ImportCategoryState } from "../../../domains/shelf/import-state-repo";
import {
  categorySyncLabel, failureText, FAILURE_LIST_MAX, hasAnySync, importErrorMessage, importPlan, isValidDoubanUid, progressCount, progressRatio, stepHasWatermark, stepLabel,
  summaryText, uidError, type ImportFailureView, type ImportTotals, type StepProgress,
} from "../../../lib/admin/douban-import";
import { finishDoubanImport, getDoubanImportState, importDoubanPage, ShelfApiError } from "../../../lib/admin/shelf-client";
import { makeBackgroundInert, trapTab } from "../../../lib/dom/modal";
import { Alert } from "../../ui/Alert";
import { Button } from "../../ui/Button";
import { Checkbox } from "../../ui/Checkbox";
import { Field } from "../../ui/Field";
import { IconButton } from "../../ui/IconButton";
import { ICONS } from "../../ui/icons";
import { useToast } from "../../ui/Toast";

export interface DoubanImportDialogProps {
  open: boolean;
  onClose(): void;
  onFinished(changed: number): void; // 关闭时本次打开期间有变更 → 列表刷新
}

// 同一豆瓣大类同一行：电影 / 剧集、书 / 漫画、游戏 / 桌游
const CATEGORY_ROWS: ShelfType[][] = [["movie", "series"], ["book", "comic"], ["game", "boardgame"]];
const ALL_TYPES = CATEGORY_ROWS.flat();
const RECHECK_DELAY_MS = 300;
const ZERO: ImportTotals = { created: 0, updated: 0, failed: 0, coverFailed: 0 };

type Mode = "full" | "incremental";
type Phase = "idle" | "running" | "stopping" | "finished";
type Plan = (ImportStep & { types: ShelfType[] })[];

interface SyncState {
  uid: string | null;
  categories: ImportCategoryState[];
}

interface Run {
  mode: Mode;
  plan: Plan;
  stepIndex: number;
  progress: StepProgress;
  totals: ImportTotals;
  failures: ImportFailureView[];
  stopped: boolean;
  error: string | null;
}

const Download = ICONS.download;
const Done = ICONS["circle-check"];

export function DoubanImportDialog({ open, onClose, onFinished }: DoubanImportDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const toast = useToast();
  const [uid, setUid] = useState("");
  const [selected, setSelected] = useState<ShelfType[]>(ALL_TYPES);
  const [sync, setSync] = useState<SyncState>({ uid: null, categories: [] });
  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState<Run | null>(null);
  const stopRef = useRef(false);
  const changedRef = useRef(0);
  const busy = phase === "running" || phase === "stopping";

  // 打开时读同步状态（失败按首次显示，不阻断全量导入）；勾选与进度不保存：调用方每次打开用新 key 重新挂载
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getDoubanImportState().then(
      (state) => {
        if (cancelled) return;
        setSync(state);
        setUid(state.uid ?? "");
      },
      () => !cancelled && setSync({ uid: null, categories: [] }),
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  // 改成另一个合法 ID 后防抖重查该 ID 的同步状态
  useEffect(() => {
    if (!open || busy || !isValidDoubanUid(uid) || uid === sync.uid) return;
    const timer = setTimeout(() => {
      getDoubanImportState(uid).then(setSync, () => setSync({ uid, categories: [] }));
    }, RECHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open, busy, uid, sync.uid]);

  useEffect(() => {
    if (!open || !rootRef.current) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreBackground = makeBackgroundInert(rootRef.current);
    inputRef.current?.focus();
    return () => {
      restoreBackground();
      previous?.focus();
    };
  }, [open]);

  // 开始 / 结束时触发按钮被替换卸载，焦点会掉到 body（Esc 与 Tab 陷阱都失效）：拉回对话框
  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && dialog && !dialog.contains(document.activeElement)) dialog.focus();
  }, [open, phase]);

  const categories = sync.uid === uid ? sync.categories : [];
  const synced = hasAnySync(categories);
  const formatError = uidError(uid);
  const canImport = isValidDoubanUid(uid) && selected.length > 0 && !busy;

  function close() {
    if (busy) return;
    if (changedRef.current > 0) onFinished(changedRef.current);
    onClose();
  }

  async function start(mode: Mode) {
    const plan = importPlan(selected);
    const known = categories;
    let totals = ZERO;
    const failures: ImportFailureView[] = [];
    let stopped = false;
    let error: string | null = null;
    stopRef.current = false;
    setPhase("running");
    const show = (stepIndex: number, progress: StepProgress) => setRun({ mode, plan, stepIndex, progress, totals, failures: [...failures], stopped: false, error: null });
    try {
      for (const [stepIndex, step] of plan.entries()) {
        const counting = mode === "incremental" && stepHasWatermark(known, step) ? "items" : "pages";
        let progress: StepProgress = { counting, processed: 0, total: 0, synced: 0 };
        show(stepIndex, progress);
        let next: number | null = 0;
        let head: string | null = null;
        while (next !== null) {
          const page = await importDoubanPage({ uid, kind: step.kind, status: step.status, types: step.types, mode, start: next, ...(next > 0 && { head }) });
          if (next === 0) head = page.head;
          totals = { created: totals.created + page.created, updated: totals.updated + page.updated, failed: totals.failed + page.failed.length, coverFailed: totals.coverFailed + page.coverFailed };
          failures.push(...page.failed);
          progress = { counting, processed: Math.min(page.nextStart ?? page.total, page.total), total: page.total, synced: progress.synced + page.created + page.updated + page.failed.length };
          show(stepIndex, progress);
          next = page.nextStart;
          const last = next === null && stepIndex === plan.length - 1;
          if (stopRef.current && !last) {
            stopped = true;
            break;
          }
        }
        if (stopped) break;
      }
    } catch (caught) {
      error = importErrorMessage(caught instanceof ShelfApiError ? caught.code : "UNKNOWN");
    }
    const changed = totals.created + totals.updated;
    if (changed > 0) {
      changedRef.current += changed;
      await finishDoubanImport(changed).then(
        () => toast.show({ tone: "success", message: "读者页将在重建后更新" }),
        () => toast.show({ tone: "error", message: "触发重建失败，请稍后在文章列表重新发布" }),
      );
    }
    setRun((current) => ({ mode, plan, stepIndex: current?.stepIndex ?? 0, progress: current?.progress ?? { counting: "pages", processed: 0, total: 0, synced: 0 }, totals, failures, stopped, error }));
    setPhase("finished");
    getDoubanImportState(uid).then(setSync, () => undefined);
  }

  function stop() {
    stopRef.current = true;
    setPhase("stopping");
  }

  function toggle(type: ShelfType, checked: boolean) {
    setSelected((list) => (checked ? ALL_TYPES.filter((t) => t === type || list.includes(t)) : list.filter((t) => t !== type)));
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    trapTab(event, dialogRef.current);
  };

  if (!open || typeof document === "undefined") return null;

  const step = run && busy ? run.plan[run.stepIndex] : null;
  const shownFailures = run?.failures.slice(0, FAILURE_LIST_MAX) ?? [];
  // 出错时若已导入部分条目，同时显示汇总（admin-media.md"错误"）
  const showSummary = phase === "finished" && run !== null && (!run.error || run.totals.created + run.totals.updated + run.totals.failed > 0);

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div data-testid="import-dialog-scrim" className="absolute inset-0 bg-scrim/37" onClick={close} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative flex outline-none max-h-full w-full max-w-[440px] flex-col gap-4 overflow-y-auto rounded-card bg-surface p-6 shadow-[0_12px_32px_rgb(0_0_0/20%)]"
      >
        <div className="flex items-center gap-2.5">
          <Download size={20} aria-hidden="true" className="shrink-0 text-ink-muted" />
          <h2 id={titleId} className="flex-1 text-title-sm font-semibold text-ink">
            从豆瓣导入
          </h2>
          {!busy && <IconButton icon="x" aria-label="关闭面板" onClick={close} />}
        </div>
        <p className="text-ui text-ink-muted">导入你在豆瓣标记过的条目（看过 / 在看，不含想看），连同评分、日期和短评。已录入过的条目会用豆瓣数据更新。</p>
        <Field label="豆瓣用户 ID" hint="豆瓣个人主页 douban.com/people/ID/ 中的 ID" error={formatError ?? undefined}>
          <input ref={inputRef} type="text" value={uid} disabled={busy} autoComplete="off" spellCheck={false} onChange={(event) => setUid(event.target.value.trim())} />
        </Field>
        <fieldset className="flex flex-col gap-2" disabled={busy}>
          <legend className="mb-2 text-meta font-medium text-ink">导入类别</legend>
          {CATEGORY_ROWS.map((row) => (
            <div key={row[0]} className="grid grid-cols-2 gap-4 max-md:gap-x-4 max-md:gap-y-0">
              {row.map((type) => (
                <Checkbox key={type} label={TYPE_LABELS[type]} hint={categorySyncLabel(categories, type)} checked={selected.includes(type)} disabled={busy} onChange={(checked) => toggle(type, checked)} />
              ))}
            </div>
          ))}
          {selected.length === 0 && <p className="text-caption text-danger">至少选择一个类别</p>}
        </fieldset>
        <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
          {step && run && (
            <>
              <p className="flex items-baseline justify-between text-meta font-medium text-ink">
                {stepLabel(step)}{" "}
                <span className="font-mono text-caption font-normal text-ink-muted">{progressCount(run.progress)}</span>
              </p>
              <div className="h-1.5 overflow-hidden rounded-[3px] bg-surface-sunken">
                <div className="h-full rounded-[3px] bg-accent transition-[width] duration-300" style={{ width: `${Math.round(progressRatio(run.progress, run.stepIndex, run.plan.length) * 100)}%` }} />
              </div>
              {run.mode === "incremental" && <p className="text-caption text-ink-faint">同步新标记：每类从最新往旧翻，到上次同步的位置即停</p>}
            </>
          )}
          {showSummary && run && (
            <>
              <p className="flex items-center gap-2 text-ui font-medium text-ink">
                {!run.error && <Done size={16} aria-hidden="true" className="shrink-0 text-ok" />}
                {summaryText(run.totals, run.mode, run.stopped || run.error !== null)}
              </p>
              {shownFailures.length > 0 && (
                <ul className="flex flex-col gap-1 rounded-control bg-surface-sunken px-3 py-2.5 text-caption text-ink-muted">
                  {shownFailures.map((failure, index) => (
                    <li key={`${failure.doubanId ?? failure.title}-${index}`}>{failureText(failure)}</li>
                  ))}
                  {run.failures.length > FAILURE_LIST_MAX && <li>另有 {run.failures.length - FAILURE_LIST_MAX} 条</li>}
                </ul>
              )}
            </>
          )}
        </div>
        {phase === "finished" && run?.error && <Alert tone="error">{run.error}</Alert>}
        <div className="flex justify-end gap-2 max-md:[&>*]:flex-1">
          {busy ? (
            <Button variant="primary" icon={phase === "stopping" ? "loader-circle" : undefined} disabled={phase === "stopping"} onClick={stop} className="[&_svg]:animate-spin motion-reduce:[&_svg]:animate-none">
              {phase === "stopping" ? "正在停止…" : "停止"}
            </Button>
          ) : (
            <>
              {/* 手机按钮各占一半：三个按钮时只留右上角 ✕ 关闭 */}
              <Button variant="outline" onClick={close} className={synced ? "max-md:hidden" : ""}>
                关闭
              </Button>
              <Button variant={synced ? "outline" : "primary"} disabled={!canImport} onClick={() => void start("full")}>
                全量导入
              </Button>
              {synced && (
                <Button variant="primary" disabled={!canImport} onClick={() => void start("incremental")}>
                  {phase === "finished" && !run?.error ? "再次同步" : "同步新标记"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
