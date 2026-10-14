import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PostListPage } from "../../../src/components/admin/PostListPage";
import type { PostListResult } from "../../../src/domains/post/service";

// [TC-US09-13][SC-DELETE-01][SC-DELETE-07] 删除唯一一篇：撤销期内即显示空状态"还没有文章"，6 秒后才发 keepalive 删除；
// E2E 共享 D1 无法造"全部删完"，这一分支在单元层覆盖
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const RENDERED_AT = "2026-10-13T02:00:00.000Z";
const result = (items: PostListResult["items"]): PostListResult => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  counts: { all: items.length, draft: items.length, published: 0 },
});
const ONLY = { id: "7", title: "唯一", status: "draft" as const, hasUnpublishedChanges: false, tags: [], updatedAt: RENDERED_AT };

describe("PostListPage 删除", () => {
  it("删除唯一一篇后显示空状态，撤销期结束才提交", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => (init?.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json(result([]))));
    vi.stubGlobal("fetch", fetchMock);
    render(<PostListPage initial={result([ONLY])} query={{ status: "all", q: "", page: 1 }} renderedAt={RENDERED_AT} />);

    const toggle = screen.getByRole("button", { name: "《唯一》的操作" });
    fireEvent.keyDown(toggle, { key: "Enter" });
    fireEvent.keyDown(toggle, { key: "Delete" });
    act(() => vi.advanceTimersByTime(200)); // 行折叠
    const during = {
      empty: screen.queryByRole("button", { name: "写第一篇" }) !== null,
      toast: screen.getByText("已删除《唯一》").closest("[role=status]") !== null,
      calls: fetchMock.mock.calls.length,
    };

    await act(async () => {
      vi.advanceTimersByTime(6000);
      await Promise.resolve();
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];

    expect({ during, url, method: init?.method, keepalive: init?.keepalive, toast: screen.queryByText("已删除《唯一》") }).toEqual({
      during: { empty: true, toast: true, calls: 0 },
      url: "/api/admin/posts/7",
      method: "DELETE",
      keepalive: true,
      toast: null,
    });
  });
});
