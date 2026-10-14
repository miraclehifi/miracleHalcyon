import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RestoreBanner } from "../../../src/components/ui/RestoreBanner";

// RestoreBanner（components.md"反馈组件"，admin-post-editor"弹层与提示"本地内容恢复）
beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {})); // jsdom 无 WebGL（Button）
afterEach(cleanup);

describe("RestoreBanner", () => {
  // [UT-79][SC-AUTOSAVE-07] 文案带本地暂存时间（本地时区"10月10日 14:35"）；"恢复本地内容" / "丢弃本地内容"各调用一次回调
  it("文案与回调", () => {
    const onRestore = vi.fn();
    const onDiscard = vi.fn();
    render(<RestoreBanner savedAt={new Date(2026, 9, 10, 14, 35)} onRestore={onRestore} onDiscard={onDiscard} />);
    const banner = screen.getByRole("region", { name: "发现未同步的本地内容，是否恢复？" });

    fireEvent.click(screen.getByRole("button", { name: "恢复本地内容" }));
    fireEvent.click(screen.getByRole("button", { name: "丢弃本地内容" }));

    expect({ text: banner.textContent, restores: onRestore.mock.calls.length, discards: onDiscard.mock.calls.length }).toEqual({
      text: "发现未同步的本地内容，是否恢复？本地暂存于 10月10日 14:35，比服务端版本更新。丢弃后无法找回。丢弃本地内容恢复本地内容",
      restores: 1,
      discards: 1,
    });
  });
});
