import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PostList } from "../../../src/components/admin/PostList";
import type { PostListItem as PostListItemData } from "../../../src/domains/post/service";

afterEach(cleanup);

const NOW = new Date("2026-10-14T10:00:00+08:00");
const posts: PostListItemData[] = ["一", "二", "三"].map((title, i) => ({
  id: String(i + 1),
  title: `文章${title}`,
  status: "draft",
  hasUnpublishedChanges: false,
  tags: [],
  updatedAt: "2026-10-14T09:00:00+08:00",
}));

const activeTitles = () => [...document.querySelectorAll("[data-active]")].map((el) => el.querySelector("a")?.textContent);

// [SC-POSTLIST-01][UT-10][UT-21] PostList（components.md"列表动效参数"）：list / listitem 语义；
// 悬停、键盘聚焦都只让一行处于 PostCard/Hover；指针离开且焦点不在列表内时复原
describe("PostList", () => {
  it("同一时间只有一行处于选中态", () => {
    render(<PostList posts={posts} now={NOW} timeZone="Asia/Shanghai" />);
    const list = screen.getByRole("list");
    const rows = screen.getAllByRole("listitem");

    fireEvent.pointerEnter(rows[1]);
    const hovered = activeTitles();
    act(() => screen.getByRole("link", { name: "文章三" }).focus());
    const focused = activeTitles();
    act(() => (document.activeElement as HTMLElement).blur());
    fireEvent.pointerLeave(list.parentElement!);
    const left = activeTitles();

    expect({
      structure: { rows: rows.length, links: screen.getAllByRole("link").map((a) => a.getAttribute("href")), listbox: screen.queryByRole("listbox"), tabbable: list.getAttribute("tabindex") },
      hovered,
      focused,
      left,
    }).toEqual({
      structure: { rows: 3, links: ["/admin/posts/1", "/admin/posts/2", "/admin/posts/3"], listbox: null, tabbable: null },
      hovered: ["文章二"],
      focused: ["文章三"],
      left: [],
    });
  });
});
