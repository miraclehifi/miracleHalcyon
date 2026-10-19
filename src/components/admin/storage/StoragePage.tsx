// 存储页主体（admin-storage.md，F-006 US-01）：打开即检测，显示未引用图片 / 实况视频与预计可释放体积。
// 页面只显示数字，不渲染任何图片或视频；加载中保留上次检测时间、按钮禁用；失败显示错误并允许重新检测。
// 一键清理（US-02）：确认框 → 清理接口（进行中不可取消、不可重复提交）→ 按接口返回提示结果 → 自动重新检测
import { useCallback, useEffect, useState } from "react";
import { cleanupOrphans, fetchOrphans, type OrphanReport } from "../../../lib/admin/storage-client";
import { cleanupConfirmText, cleanupResultText } from "../../../lib/admin/storage-text";
import { formatBytes } from "../../../lib/format/bytes";
import { Alert } from "../../ui/Alert";
import { Button } from "../../ui/Button";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { IconButton } from "../../ui/IconButton";
import { ICONS } from "../../ui/icons";
import { StatCard } from "../../ui/StatCard";
import { ToastProvider, useToast } from "../../ui/Toast";
import { PageHeader } from "../PageHeader";

interface DetectState {
  report: OrphanReport | null; // 最近一次成功的检测
  loading: boolean;
  error: boolean;
}

const pad = (value: number) => String(value).padStart(2, "0");

// 当天"HH:mm"，跨天"M月D日 HH:mm"（浏览器时区）
function checkedAtText(iso: string, now = new Date()): string {
  const at = new Date(iso);
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  return at.toDateString() === now.toDateString() ? time : `${at.getMonth() + 1}月${at.getDate()}日 ${time}`;
}

function StorageContent() {
  const [state, setState] = useState<DetectState>({ report: null, loading: true, error: false });
  const [confirming, setConfirming] = useState(false);
  const toast = useToast();

  // 只在请求返回后写状态；首次检测由初始状态 loading: true 表示加载中
  const load = useCallback(
    () =>
      fetchOrphans().then(
        (report) => setState({ report, loading: false, error: false }),
        () => setState((prev) => ({ ...prev, loading: false, error: true })),
      ),
    [],
  );

  const detect = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    return load();
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  const { report, loading, error } = state;
  const summary = report?.summary;
  const orphanCount = summary ? summary.orphanImageCount + summary.orphanVideoCount : 0;
  const ready = !loading && !error && summary !== undefined;
  const clean = ready && orphanCount === 0;
  const note = error ? "上次检测失败" : report ? `检测于 ${checkedAtText(report.checkedAt)}` : "检测中…";
  const Good = ICONS["circle-check"];

  // 结果按接口返回值提示（服务端按清理时的文章内容重新判定，可能少于页面上的统计）
  const runCleanup = async () => {
    try {
      toast.show({ tone: "success", message: cleanupResultText(await cleanupOrphans()) });
    } catch {
      toast.show({ tone: "error", message: "清理未完成，请重试" });
    } finally {
      setConfirming(false);
      void detect();
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[896px] flex-col gap-6 pt-12 pb-20 max-md:gap-4 max-md:overflow-x-clip max-md:px-4 max-md:pt-6">
      <div className="flex flex-col gap-2">
        <PageHeader
          title="存储"
          action={
            <>
              <span className="max-md:hidden">
                <Button variant="secondary" icon="refresh-cw" disabled={loading} onClick={() => void detect()}>
                  重新检测
                </Button>
              </span>
              <span className="md:hidden">
                <IconButton icon="refresh-cw" size="touch" aria-label="重新检测" disabled={loading} onClick={() => void detect()} />
              </span>
            </>
          }
        />
        <p className="text-caption text-ink-faint">{`${note} · 只统计没有文章在用的文件`}</p>
      </div>

      <section aria-labelledby="storage-stats-title" aria-busy={loading || undefined} className="flex flex-col gap-3">
        <h2 id="storage-stats-title" className="sr-only">
          未引用资源
        </h2>
        {error ? (
          <Alert tone="error">检测失败，请重试</Alert>
        ) : (
          <div className="flex gap-4 max-md:flex-col">
            <StatCard label="未引用图片" value={`${summary?.orphanImageCount ?? 0} 张`} detail={formatBytes(summary?.orphanImageBytes ?? 0)} loading={loading} />
            <StatCard label="未引用实况视频" value={`${summary?.orphanVideoCount ?? 0} 个`} detail={formatBytes(summary?.orphanVideoBytes ?? 0)} loading={loading} />
            <StatCard label="预计可释放" value={formatBytes(summary?.totalOrphanBytes ?? 0)} highlight={orphanCount > 0} loading={loading} />
          </div>
        )}
        {!error && summary && summary.protectedCount > 0 && <p className="text-caption text-ink-muted">{`近 24 小时上传的 ${summary.protectedCount} 项不参与清理`}</p>}
        <p className="sr-only" aria-live="polite">
          {ready ? `未引用 ${orphanCount} 项，可释放 ${formatBytes(summary.totalOrphanBytes)}` : ""}
        </p>
      </section>

      <div className="flex flex-col items-start gap-2 pt-4 max-md:items-stretch">
        {clean && (
          <p role="status" className="flex items-center gap-2 text-ui text-ink-muted">
            <Good size={16} aria-hidden="true" />
            存储状态良好，无未引用文件
          </p>
        )}
        <Button variant="danger" disabled={!ready || orphanCount === 0} onClick={() => setConfirming(true)}>
          一键清理未引用资源
        </Button>
        <p className="text-caption text-ink-faint">清理后无法恢复。正在使用的文件、24 小时内上传的文件不会被清理。</p>
      </div>

      <ConfirmDialog
        open={confirming}
        tone="danger"
        icon="trash-2"
        title="清理未引用资源"
        description={summary ? cleanupConfirmText({ images: summary.orphanImageCount, videos: summary.orphanVideoCount, bytes: summary.totalOrphanBytes }) : ""}
        confirmLabel="清理"
        onConfirm={runCleanup}
        onCancel={() => setConfirming(false)}
      />
    </main>
  );
}

export function StoragePage() {
  return (
    <ToastProvider>
      <StorageContent />
    </ToastProvider>
  );
}
