import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PostListPage } from "../../../src/components/admin/PostListPage";
import type { PostListResult } from "../../../src/domains/post/service";
import type { ListQueryState } from "../../../src/lib/admin/list-query";

// [UT-11][UT-12][TC-US07-17][TC-US07-18][SC-POSTLIST-06][SC-POSTLIST-07] 列表两种空态（admin-post-list.md"页面状态"）
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const RENDERED_AT = "2026-10-13T02:00:00.000Z";
const result = (items: PostListResult["items"], all: number): PostListResult => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  counts: { all, draft: 0, published: all },
});
const ONE_POST = { id: "1", title: "Hello", status: "published" as const, hasUnpublishedChanges: false, tags: [], updatedAt: RENDERED_AT };

function view(initial: PostListResult, query: ListQueryState) {
  render(<PostListPage initial={initial} query={query} renderedAt={RENDERED_AT} />);
  const state = {
    text: screen.queryByRole("status")?.textContent ?? null,
    firstPost: screen.queryByRole("button", { name: "写第一篇" }) !== null,
    clear: screen.queryByRole("button", { name: "清除筛选" }) !== null,
    filters: screen.queryByRole("radiogroup") !== null,
  };
  return state;
}

describe("PostListPage 空状态", () => {
  it("无任何文章：图标 + 还没有文章 + 写第一篇，隐藏筛选；筛选无结果：写明条件 +\"清除筛选\"，点击回到默认视图", async () => {
    const none = view(result([], 0), { status: "all", q: "", page: 1 });
    cleanup();
    const statusOnly = view(result([], 3), { status: "draft", q: "", page: 1 });
    cleanup();
    const keyword = view(result([], 0), { status: "draft", q: "xyz", page: 1 });

    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(result([ONE_POST], 1)));
    vi.stubGlobal("fetch", fetchMock);
    fireEvent.click(screen.getByRole("button", { name: "清除筛选" }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));

    expect({
      none,
      statusOnly,
      keyword,
      afterClear: {
        url: window.location.pathname + window.location.search,
        request: fetchMock.mock.calls[0]?.[0],
        search: (screen.getByRole("searchbox") as HTMLInputElement).value,
        checked: screen.getByRole("radio", { checked: true }).textContent,
      },
    }).toEqual({
      none: { text: "还没有文章写下第一篇，草稿会自动保存", firstPost: true, clear: false, filters: false },
      statusOnly: { text: "还没有草稿文章", firstPost: false, clear: true, filters: true },
      keyword: { text: "没有标题包含“xyz”的草稿文章", firstPost: false, clear: true, filters: true },
      afterClear: { url: "/admin", request: "/api/admin/posts", search: "", checked: "全部1" },
    });
  });
});
