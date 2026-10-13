// Alert（components.md"反馈组件"）：页面内常驻提示，目前只有 error（登录页凭据错误）
import type { ReactNode } from "react";
import { ICONS } from "./icons";

export type AlertTone = "error";

const TONES: Record<AlertTone, { className: string; icon: keyof typeof ICONS; role: "alert" }> = {
  error: { className: "bg-danger-soft text-danger", icon: "circle-alert", role: "alert" },
};

export interface AlertProps {
  tone: AlertTone;
  children: ReactNode;
}

export function Alert({ tone, children }: AlertProps) {
  const { className, icon, role } = TONES[tone];
  const Icon = ICONS[icon];

  return (
    <div role={role} className={`flex items-center gap-2 rounded-control px-3 py-2.5 text-meta ${className}`}>
      <Icon size={16} aria-hidden="true" className="shrink-0" />
      <span>{children}</span>
    </div>
  );
}
