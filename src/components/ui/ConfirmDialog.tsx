// ConfirmDialog（components.md"反馈组件"，admin-post-editor"模态框"）
// 打开时背景 inert、焦点限制在框内、初始焦点在"取消"（防误删）；Esc 和点遮罩都等于取消；关闭后焦点回到触发元素
// onConfirm 返回 Promise 时为进行中：确认按钮加载并禁用，"取消"禁用，Esc / 遮罩不关闭（防重复提交）
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "./Button";
import { ICONS, type IconName } from "./icons";

export type ConfirmDialogTone = "danger" | "default";

export interface ConfirmDialogProps {
  open: boolean;
  tone: ConfirmDialogTone;
  icon: IconName;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm(): void | Promise<unknown>;
  onCancel(): void;
}

const TONES: Record<ConfirmDialogTone, { iconClass: string; confirm: "danger" | "primary" }> = {
  danger: { iconClass: "text-danger", confirm: "danger" },
  default: { iconClass: "text-ink-muted", confirm: "primary" },
};

// 把 body 下除弹窗外的元素设为 inert，返回恢复函数
function makeBackgroundInert(host: HTMLElement): () => void {
  const changed = [...document.body.children].filter((el) => el !== host && !el.hasAttribute("inert"));
  changed.forEach((el) => el.setAttribute("inert", ""));
  return () => changed.forEach((el) => el.removeAttribute("inert"));
}

export function ConfirmDialog({ open, tone, icon, title, description, confirmLabel, cancelLabel = "取消", onConfirm, onCancel }: ConfirmDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [pending, setPending] = useState(false);
  const { iconClass, confirm } = TONES[tone];
  const Icon = ICONS[icon];

  const cancel = () => {
    if (!pending) onCancel();
  };
  const confirmAction = () => {
    if (pending) return;
    const result = onConfirm();
    if (!(result instanceof Promise)) return;
    setPending(true);
    void result.catch(() => {}).finally(() => setPending(false));
  };

  // effect 在提交后运行，此时弹窗已挂到 body 上
  useEffect(() => {
    if (!open || !rootRef.current) return;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreBackground = makeBackgroundInert(rootRef.current);
    dialogRef.current?.querySelector<HTMLElement>("[data-dialog-cancel]")?.focus();
    return () => {
      restoreBackground();
      returnFocus?.focus();
    };
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])];
    if (focusable.length === 0) return;
    event.preventDefault();
    const index = focusable.indexOf(document.activeElement as HTMLElement);
    const step = event.shiftKey ? -1 : 1;
    focusable[(index + step + focusable.length) % focusable.length].focus();
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div data-testid="confirm-dialog-scrim" className="absolute inset-0 bg-scrim/37" onClick={cancel} />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={onKeyDown}
        className="relative flex w-full max-w-[380px] flex-col gap-4 rounded-card bg-surface p-6 shadow-[0_12px_32px_rgb(42_37_31/20%)]"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={20} aria-hidden="true" className={`shrink-0 ${iconClass}`} />
          <h2 id={titleId} className="text-title-sm font-semibold text-ink">
            {title}
          </h2>
        </div>
        <p id={descriptionId} className="text-ui text-ink-muted">
          {description}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" data-dialog-cancel disabled={pending} onClick={cancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirm}
            icon={pending ? "loader" : undefined}
            disabled={pending}
            aria-busy={pending || undefined}
            onClick={confirmAction}
            className="[&_svg]:animate-spin motion-reduce:[&_svg]:animate-none"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
