// Toast 与提示队列（components.md"反馈组件"，design-tokens"轻提示"）
// success 4 秒自动消失（status）；error 常驻（alert）、warning 常驻（status），都可点 × 关闭
// action（撤销，6 秒、悬停暂停）留到 Sprint 2
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IconButton } from "./IconButton";
import { ICONS, type IconName } from "./icons";

export type ToastTone = "success" | "error" | "warning";

export interface ToastInput {
  tone: ToastTone;
  message: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

export const SUCCESS_TIMEOUT_MS = 4000;

const TONES: Record<ToastTone, { className: string; icon: IconName; role: "status" | "alert"; dismissible: boolean }> = {
  success: { className: "bg-ok-soft text-ok", icon: "circle-check", role: "status", dismissible: false },
  error: { className: "bg-danger-soft text-danger", icon: "circle-alert", role: "alert", dismissible: true },
  warning: { className: "bg-warn-soft text-warn", icon: "triangle-alert", role: "status", dismissible: true },
};

export function Toast({ tone, message, onDismiss }: ToastInput & { onDismiss?: () => void }) {
  const { className, icon, role, dismissible } = TONES[tone];
  const Icon = ICONS[icon];

  return (
    <div
      role={role}
      className={`flex w-full items-center gap-2.5 rounded-control py-1 pr-1.5 pl-3.5 text-meta [--icon-button-ink:currentColor] ${className}`}
    >
      <Icon size={16} aria-hidden="true" className="shrink-0" />
      <span className="flex-1 py-1.5">{message}</span>
      {dismissible && onDismiss && <IconButton icon="x" aria-label="关闭提示" onClick={onDismiss} />}
    </div>
  );
}

interface ToastApi {
  show(input: ToastInput): number;
  dismiss(id: number): void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast 需要在 <ToastProvider> 内使用");
  return api;
}

// 页面底部居中，新提示叠在下方
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = ++nextId.current;
      setItems((current) => [...current, { ...input, id }]);
      if (input.tone === "success") timers.current.set(id, setTimeout(() => dismiss(id), SUCCESS_TIMEOUT_MS));
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        <div className="pointer-events-auto flex w-full max-w-[360px] flex-col gap-2">
          {items.map((item) => (
            <Toast key={item.id} tone={item.tone} message={item.message} onDismiss={() => dismiss(item.id)} />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}
