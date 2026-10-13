import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast, type ToastInput } from "../../../src/components/ui/Toast";

// Toast（components.md"反馈组件"，design-tokens"轻提示"）
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function Pusher({ toasts }: { toasts: ToastInput[] }) {
  const toast = useToast();
  useEffect(() => toasts.forEach(toast.show), [toast, toasts]);
  return null;
}

const TOASTS: ToastInput[] = [
  { tone: "success", message: "已发布，几分钟后读者可见" },
  { tone: "error", message: "发布前请填写：标题、正文" },
  { tone: "warning", message: "实况视频超过 10MB，已作为普通图片插入" },
];

describe("Toast", () => {
  it("success 4 秒后消失且为 status；error / warning 常驻直到点 ×；error 为 alert", () => {
    render(
      <ToastProvider>
        <Pusher toasts={TOASTS} />
      </ToastProvider>,
    );
    const roleOf = (text: string) => screen.queryByText(text)?.closest("[role]")?.getAttribute("role") ?? null;

    const initial = { success: roleOf(TOASTS[0].message), error: roleOf(TOASTS[1].message), warning: roleOf(TOASTS[2].message) };
    act(() => vi.advanceTimersByTime(3999));
    const before4s = screen.queryByText(TOASTS[0].message) !== null;
    act(() => vi.advanceTimersByTime(1));
    const after4s = screen.queryByText(TOASTS[0].message) !== null;
    act(() => vi.advanceTimersByTime(60_000));
    const persistent = [TOASTS[1], TOASTS[2]].map((t) => screen.queryByText(t.message) !== null);
    fireEvent.click(screen.getAllByRole("button", { name: "关闭提示" })[0]);
    const afterClose = [TOASTS[1], TOASTS[2]].map((t) => screen.queryByText(t.message) !== null);

    expect({ initial, before4s, after4s, persistent, afterClose }).toEqual({
      initial: { success: "status", error: "alert", warning: "status" },
      before4s: true,
      after4s: false,
      persistent: [true, true],
      afterClose: [false, true],
    });
  });
});
