import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconButton } from "../../../src/components/ui/IconButton";

// IconButton（components.md"基础组件"）：aria-label 必填；sm 28px（桌面）/ touch 44px（手机）
afterEach(cleanup);

describe("IconButton", () => {
  it("缺 aria-label 类型报错且运行时告警；sm 28px、touch 44px 可点区域，图标 16px", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // @ts-expect-error aria-label 必填（astro check 校验：若变成可选，这一行会报"未使用的 @ts-expect-error"）
    render(<IconButton icon="x" />);
    const warned = warn.mock.calls.some(([message]) => String(message).includes("aria-label"));

    render(<IconButton icon="x" aria-label="关闭" />);
    render(<IconButton icon="ellipsis" aria-label="更多操作" size="touch" variant="outline" />);
    const sm = screen.getByRole("button", { name: "关闭" });
    const touch = screen.getByRole("button", { name: "更多操作" });

    expect({
      warned,
      sm: { size: sm.classList.contains("size-7"), icon: sm.querySelector("svg")?.getAttribute("width") },
      touch: { size: touch.classList.contains("size-11"), outline: touch.dataset.variant, icon: touch.querySelector("svg")?.getAttribute("width") },
    }).toEqual({
      warned: true,
      sm: { size: true, icon: "16" },
      touch: { size: true, outline: "outline", icon: "16" },
    });
  });
});
