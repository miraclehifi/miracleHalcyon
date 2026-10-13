import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SaveIndicator, type SaveState } from "../../../src/components/ui/SaveIndicator";

// SaveIndicator（components.md"基础组件"，admin-post-editor"保存状态"）
afterEach(cleanup);

const SAVED_AT = new Date(2026, 9, 13, 14, 5); // 本地时区 14:05

function look(state: SaveState) {
  const { container } = render(<SaveIndicator state={state} savedAt={SAVED_AT} />);
  const root = container.firstElementChild as HTMLElement;
  return {
    role: root.getAttribute("role"),
    icon: [...(root.querySelector("svg")?.classList ?? [])].find((c) => c.startsWith("lucide-") && c !== "lucide-icon"),
    text: root.textContent,
    color: [...root.classList].find((c) => /^text-(ink|danger)/.test(c)),
  };
}

describe("SaveIndicator", () => {
  it("4 种状态的图标、文案与颜色；saved 显示本地 HH:mm 且用 tabular-nums", () => {
    const states = { saved: look("saved"), saving: look("saving"), unsaved: look("unsaved"), failed: look("failed") };
    cleanup();
    const { getByText } = render(<SaveIndicator state="saved" savedAt={SAVED_AT} />);

    expect({ states, tabular: getByText("14:05").classList.contains("tabular-nums") }).toEqual({
      states: {
        saved: { role: "status", icon: "lucide-cloud-check", text: "已保存 · 14:05", color: "text-ink-faint" },
        saving: { role: "status", icon: "lucide-loader", text: "保存中…", color: "text-ink-faint" },
        unsaved: { role: "status", icon: "lucide-circle-dot", text: "未保存", color: "text-ink-muted" },
        failed: { role: "status", icon: "lucide-cloud-off", text: "保存失败，将自动重试", color: "text-danger" },
      },
      tabular: true,
    });
  });
});
