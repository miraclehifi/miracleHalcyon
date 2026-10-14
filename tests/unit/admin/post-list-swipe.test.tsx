import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PostList } from "../../../src/components/admin/PostList";
import type { PostListItem as PostListItemData } from "../../../src/domains/post/service";

afterEach(cleanup);

const posts: PostListItemData[] = ["甲", "乙"].map((title, i) => ({
  id: String(i + 1),
  title,
  status: "draft",
  hasUnpublishedChanges: false,
  tags: [],
  updatedAt: "2026-10-14T09:00:00+08:00",
}));

const openRows = () => [...document.querySelectorAll("[role=group][data-open]")].map((group) => group.getAttribute("aria-label"));

// [SC-DELETE-09] 行操作抽屉（components.md"行滑动参数"）：⋯ 开合（鼠标点击也可以）；同一时间只开一行；
// 抽屉关闭时"编辑 / 删除"不可聚焦；编辑是链接；标题链接不可拖拽
describe("PostList 行操作抽屉", () => {
  it("点 ⋯ 打开，再点另一行的 ⋯ 时前一行收起", () => {
    render(<PostList posts={posts} onDelete={() => {}} />);
    const toggles = [screen.getByRole("button", { name: "《甲》的操作" }), screen.getByRole("button", { name: "《乙》的操作" })];
    const closedInert = document.querySelector("[data-rail]")?.hasAttribute("inert");

    const click = (button: HTMLElement) => fireEvent.click(button, { detail: 1 }); // 鼠标点击（detail 0 是键盘触发，在 keydown 处理）
    click(toggles[0]);
    const first = { open: openRows(), expanded: toggles[0].getAttribute("aria-expanded") };
    click(toggles[1]);
    const second = openRows();
    click(toggles[1]);
    const none = openRows();

    expect({
      closedInert,
      first,
      second,
      none,
      edit: screen.getAllByRole("link", { name: "编辑", hidden: true }).map((a) => a.getAttribute("href")), // 抽屉关闭时 aria-hidden
      draggable: screen.getByRole("link", { name: "甲" }).getAttribute("draggable"),
    }).toEqual({
      closedInert: true,
      first: { open: ["《甲》"], expanded: "true" },
      second: ["《乙》"],
      none: [],
      edit: ["/admin/posts/1", "/admin/posts/2"],
      draggable: "false",
    });
  });
});
