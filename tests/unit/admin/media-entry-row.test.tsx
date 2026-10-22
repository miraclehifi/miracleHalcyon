import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaEntryRow } from "../../../src/components/admin/media/MediaEntryRow";
import type { ShelfEntryView } from "../../../src/lib/admin/shelf-client";

// MediaEntryRow（components.md、admin-media.md §一）
const entry = (patch: Partial<ShelfEntryView> = {}): ShelfEntryView => ({
  id: "7", type: "book", title: "原则", creator: "瑞·达利欧", year: 2018, status: "completed", rating: 4, markedOn: "2026-10-01",
  comment: null, cover: "/covers/2026/10/aaaaaaaaaaaa.jpg", doubanUrl: null, doubanId: null, hidden: false,
  createdAt: "2026-10-21T06:30:00.000Z", updatedAt: "2026-10-21T06:30:00.000Z", ...patch,
});

const setup = (patch: Partial<ShelfEntryView> = {}) => {
  const onToggleHidden = vi.fn();
  const onDelete = vi.fn();
  render(<ul><MediaEntryRow entry={entry(patch)} onToggleHidden={onToggleHidden} onDelete={onDelete} /></ul>);
  return { onToggleHidden, onDelete };
};

afterEach(cleanup);

describe("MediaEntryRow", () => {
  // [SC-MANAGE-01] 评分用 StarRating/Small：桌面列与手机行都是 5 颗表情星、前 N 颗点亮（rating-face-stars）
  it("评分：表情星，桌面与手机各一组", () => {
    setup({ rating: 4 });
    const groups = screen.getAllByRole("img", { name: "评分 4 / 5" });
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect([...group.querySelectorAll("[data-star]")].map((m) => m.hasAttribute("data-lit"))).toEqual([true, true, true, true, false]);
    }
    expect(screen.queryByText(/★/)).toBeNull();
  });

  // [SC-MANAGE-01] 已完成：标题链接、作者、星级、状态动词、日期；按钮 aria-label 含标题
  it("已完成条目", () => {
    setup();
    expect(screen.getAllByRole("link", { name: "原则" })[0].getAttribute("href")).toBe("/admin/media/7");
    expect(screen.getAllByText("瑞·达利欧").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("评分 4 / 5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("读过").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2026-10-01").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "编辑《原则》" }).getAttribute("href")).toBe("/admin/media/7");
    expect(screen.getByRole("button", { name: "隐藏《原则》" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "删除《原则》" })).toBeTruthy();
    expect(screen.queryByText("已隐藏")).toBeNull();
  });

  // [SC-MANAGE-02] 进行中徽标；无评分不渲染星级；无作者显示 —；无封面占位
  it("进行中、无评分、无作者、无封面", () => {
    setup({ type: "movie", status: "in_progress", rating: null, creator: null, cover: null });
    expect(screen.getAllByText("在看").length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/^评分/)).toBeNull();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("img", { name: "无封面" }).length).toBeGreaterThan(0);
  });

  // [SC-MANAGE-14] 隐藏态：徽标、按钮切换为取消隐藏；点击回调
  it("隐藏态与回调", () => {
    const { onToggleHidden, onDelete } = setup({ hidden: true });
    expect(screen.getAllByText("已隐藏").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "取消隐藏《原则》" }));
    fireEvent.click(screen.getByRole("button", { name: "删除《原则》" }));
    expect(onToggleHidden).toHaveBeenCalledWith(expect.objectContaining({ id: "7" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "7" }), expect.any(HTMLElement));
  });

  // 手机端 ⋯ 菜单：编辑 / 隐藏 / 删除
  it("手机端更多菜单", () => {
    const { onToggleHidden } = setup();
    fireEvent.click(screen.getByRole("button", { name: "《原则》的操作" }));
    const menu = screen.getByRole("menu", { name: "《原则》的操作" });
    expect([...menu.querySelectorAll('[role="menuitem"]')].map((b) => b.textContent)).toEqual(["编辑", "隐藏", "删除"]);
    fireEvent.click(screen.getByRole("menuitem", { name: "隐藏" }));
    expect(onToggleHidden).toHaveBeenCalledTimes(1);
  });
});
