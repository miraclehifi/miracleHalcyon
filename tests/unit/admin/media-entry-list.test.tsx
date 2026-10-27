import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MediaEntryList } from "../../../src/components/admin/media/MediaEntryList";
import type { ShelfEntryView } from "../../../src/lib/admin/shelf-client";

// 书影音条目列表（admin-media.md §一，设计稿 10）
afterEach(cleanup);

const counts = { total: 12, inProgress: 2, hidden: 1 };

describe("MediaEntryList 标题区", () => {
  // [SC-MANAGE-01] 说明行：计数（含已隐藏）+ 读者页地址，排在标题下方
  it("书：说明行在标题下方，读者页为 /media", () => {
    render(<MediaEntryList type="book" entries={[]} counts={counts} />);
    const meta = screen.getByText("12 本 · 在读 2 · 已隐藏 1");
    const heading = screen.getByRole("heading", { level: 1, name: "书影音" });
    expect(heading.compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(heading.parentElement?.className).toContain("flex-col");
    expect(screen.getByRole("link", { name: "/media" }).getAttribute("href")).toBe("/media");
  });

  // [SC-MANAGE-01] 其他分类的读者页地址为 /media/{type}
  it("电影：读者页为 /media/movie", () => {
    render(<MediaEntryList type="movie" entries={[]} counts={{ total: 3, inProgress: 0, hidden: 0 }} />);
    expect(screen.getByText("3 部")).toBeTruthy();
    expect(screen.getByRole("link", { name: "/media/movie" }).getAttribute("href")).toBe("/media/movie");
  });
});

const entry: ShelfEntryView = {
  id: "7", type: "book", title: "原则", creator: null, year: null, status: "completed", rating: null, markedOn: "2026-10-01",
  comment: null, cover: null, platform: null, coverUrl: null, coverWidth: null, coverHeight: null, doubanUrl: null, doubanId: null, hidden: false,
  createdAt: "2026-10-21T06:30:00.000Z", updatedAt: "2026-10-21T06:30:00.000Z",
};

describe("MediaEntryList 删除确认框焦点", () => {
  // [SC-MANAGE-16] 点击不会让按钮获得焦点（WebKit、jsdom 的 click）时，取消后焦点仍回到该行删除按钮
  it("取消后焦点回到删除按钮", () => {
    render(<MediaEntryList type="book" entries={[entry]} counts={{ total: 1, inProgress: 0, hidden: 0 }} />);
    const trigger = screen.getByRole("button", { name: "删除《原则》" });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(document.activeElement).toBe(trigger);
  });
});

describe("MediaEntryList 跨页提示", () => {
  // [SC-MANAGE-05] 保存后回列表：取出 flash 显示一次
  it("挂载时显示并清除 flash", () => {
    sessionStorage.setItem("admin:flash", JSON.stringify({ tone: "success", message: "已保存，读者页将在重建后更新" }));
    render(<MediaEntryList type="book" entries={[]} counts={{ total: 0, inProgress: 0, hidden: 0 }} />);
    expect(screen.getByText("已保存，读者页将在重建后更新")).toBeTruthy();
    expect(sessionStorage.getItem("admin:flash")).toBeNull();
  });
});
