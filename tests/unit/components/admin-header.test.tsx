import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminHeader } from "../../../src/components/admin/AdminHeader";

// AdminHeader（components.md）：导航"文章 / 书影音 / 存储"，current 标当前项；手机端图标带 aria-label（F-005 增量）
afterEach(cleanup);

describe("AdminHeader", () => {
  // [TC-US01-01][SC-MANAGE-01]
  it("桌面导航三项，current=media 时书影音为当前项", () => {
    render(<AdminHeader current="media" />);
    const [desktop, mobile] = screen.getAllByRole("navigation", { name: "后台导航" });
    const links = within(desktop).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href"), a.getAttribute("aria-current")])).toEqual([
      ["文章", "/admin", null],
      ["书影音", "/admin/media", "page"],
      ["存储", "/admin/storage", null],
    ]);
    expect(within(mobile).getAllByRole("link").map((a) => [a.getAttribute("aria-label"), a.getAttribute("aria-current")])).toEqual([
      ["文章", null],
      ["书影音", "page"],
      ["存储", null],
    ]);
  });

  it("其他页面的当前项不变", () => {
    render(<AdminHeader current="storage" />);
    const [desktop] = screen.getAllByRole("navigation", { name: "后台导航" });
    expect(within(desktop).getByRole("link", { name: "存储" }).getAttribute("aria-current")).toBe("page");
    expect(within(desktop).getByRole("link", { name: "书影音" }).getAttribute("aria-current")).toBeNull();
  });
});
