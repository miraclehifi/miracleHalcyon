// SaveIndicator（components.md"基础组件"，admin-post-editor"保存状态"）
import { ICONS, type IconName } from "./icons";

export type SaveState = "saved" | "saving" | "unsaved" | "failed";

const STATES: Record<SaveState, { icon: IconName; label: string; className: string }> = {
  saved: { icon: "cloud-check", label: "已保存", className: "text-ink-faint" },
  saving: { icon: "loader", label: "保存中…", className: "text-ink-faint" },
  unsaved: { icon: "circle-dot", label: "未保存", className: "text-ink-muted" },
  failed: { icon: "cloud-off", label: "保存失败，将自动重试", className: "text-danger" },
};

// 本地时区 HH:mm
function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export interface SaveIndicatorProps {
  state: SaveState;
  savedAt?: Date;
}

export function SaveIndicator({ state, savedAt }: SaveIndicatorProps) {
  const { icon, label, className } = STATES[state];
  const Icon = ICONS[icon];

  return (
    <span role="status" className={`inline-flex items-center gap-1.5 text-meta whitespace-nowrap ${className}`}>
      <Icon
        size={16}
        aria-hidden="true"
        className={`shrink-0${state === "saving" ? " animate-spin motion-reduce:animate-none" : ""}`}
      />
      {label}
      {state === "saved" && savedAt && (
        <>
          {" · "}
          <span className="tabular-nums">{formatTime(savedAt)}</span>
        </>
      )}
    </span>
  );
}
