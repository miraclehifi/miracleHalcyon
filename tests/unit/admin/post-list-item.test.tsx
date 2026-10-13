import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PostListItem } from "../../../src/components/admin/PostListItem";
import type { PostListItem as PostListItemData } from "../../../src/domains/post/service";

// [UT-10][SC-POSTLIST-01][SC-POSTLIST-02] PostListItem（admin-post-list.md"列表行"）：标题链接扩到整行；无标题斜体；徽标 + 更新于相对时间
afterEach(cleanup);

const NOW = new Date("2026-10-13T10:00:00+08:00");
const post = (overrides: Partial<PostListItemData>): PostListItemData => ({
  id: "7",
  title: "Hello Astro",
  status: "published",
  hasUnpublishedChanges: true,
  tags: ["astro"],
  updatedAt: "2026-10-13T09:15:00+08:00",
  ...overrides,
});

function look(data: PostListItemData) {
  const { container } = render(<PostListItem post={data} now={NOW} timeZone="Asia/Shanghai" />);
  const link = screen.getByRole("link");
  const text = container.textContent;
  cleanup();
  return {
    href: link.getAttribute("href"),
    name: link.textContent,
    stretched: link.className.includes("after:absolute") && link.className.includes("after:inset-0"),
    italic: link.querySelector("em, .italic") !== null,
    text,
  };
}

describe("PostListItem", () => {
  it("标题链接到 /admin/posts/:id 且伪元素扩到整行；无标题显示斜体\"无标题\"；徽标 + 更新于相对时间，不显示标签", () => {
    expect({
      titled: look(post({})),
      untitled: look(post({ id: "8", title: "", status: "draft", hasUnpublishedChanges: false, updatedAt: "2026-10-12T08:00:00+08:00" })),
    }).toEqual({
      titled: { href: "/admin/posts/7", name: "Hello Astro", stretched: true, italic: false, text: "Hello Astro已发布 · 有未发布修改更新于 45 分钟前" },
      untitled: { href: "/admin/posts/8", name: "无标题", stretched: true, italic: true, text: "无标题草稿更新于 10月12日" },
    });
  });
});
