import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// MediaTypeTabs（components.md"分类导航参数"，Backlog gooey-media-tabs）：GooeyNav 岛；jsdom 无 WebGL2，走 DOM 胶囊兜底
const navigate = vi.fn();
vi.mock("../../../src/lib/dom/navigate", () => ({ navigate: (url: string) => navigate(url) }));
const reduced = { value: false };
vi.mock("../../../src/lib/dom/theme", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/lib/dom/theme")>()),
  useReducedMotion: () => reduced.value,
}));

const { MediaTypeTabs } = await import("../../../src/components/reader/MediaTypeTabs");

const ITEMS = [
  { label: "书", href: "/media" },
  { label: "漫画", href: "/media/comic" },
  { label: "电影", href: "/media/movie" },
  { label: "剧集", href: "/media/series" },
  { label: "游戏", href: "/media/game" },
  { label: "桌游", href: "/media/boardgame" },
];

const nav = () => screen.getByRole("navigation", { name: "书影音分类" });
const link = (name: string) => within(nav()).getByRole("link", { name });

beforeEach(() => {
  vi.useFakeTimers();
  navigate.mockClear();
  reduced.value = false;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("MediaTypeTabs", () => {
  // [TC-US03-18][SC-SHELF-02] 7 个链接、当前项 aria-current、nav 名称、data 属性
  it("链接与当前项", () => {
    render(<MediaTypeTabs items={ITEMS} activeIndex={2} />);
    const links = within(nav()).getAllByRole("link");
    expect(links.map((a) => [a.textContent, a.getAttribute("href"), a.getAttribute("aria-current")])).toEqual(
      ITEMS.map((item, i) => [item.label, item.href, i === 2 ? "page" : null]),
    );
    expect(nav().hasAttribute("data-media-tabs")).toBe(true);
  });

  // 就绪前当前项自带胶囊样式；挂载后 nav 带 data-ready
  it("就绪前胶囊与 data-ready", () => {
    render(<MediaTypeTabs items={ITEMS} activeIndex={0} />);
    expect(nav().className).toContain("[&:not([data-ready])_[data-active]>a]:bg-[var(--gn-pill)]");
    expect(link("书").closest("li")?.hasAttribute("data-active")).toBe(true);
    expect(nav().hasAttribute("data-ready")).toBe(true);
  });

  // [SC-SHELF-02] 普通左键点击其他项：阻止默认跳转，切换当前项，700ms 后 navigate
  it("普通点击先动画后跳转", () => {
    render(<MediaTypeTabs items={ITEMS} activeIndex={0} />);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    act(() => void link("电影").dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(link("电影").getAttribute("aria-current")).toBe("page");
    act(() => vi.advanceTimersByTime(699));
    expect(navigate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(navigate).toHaveBeenCalledWith("/media/movie");
  });

  it("Ctrl / ⌘ / Shift / 中键点击不拦截、不切换", () => {
    render(<MediaTypeTabs items={ITEMS} activeIndex={0} />);
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }]) {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
      act(() => void link("剧集").dispatchEvent(event));
      expect(event.defaultPrevented).toBe(false);
    }
    act(() => vi.advanceTimersByTime(1000));
    expect([navigate.mock.calls.length, link("书").getAttribute("aria-current")]).toEqual([0, "page"]);
  });

  it("点击当前项不跳转", () => {
    render(<MediaTypeTabs items={ITEMS} activeIndex={0} />);
    fireEvent.click(link("书"));
    act(() => vi.advanceTimersByTime(1000));
    expect(navigate).not.toHaveBeenCalled();
  });

  it("减弱动效时立即跳转", () => {
    reduced.value = true;
    render(<MediaTypeTabs items={ITEMS} activeIndex={0} />);
    fireEvent.click(link("游戏"));
    act(() => vi.advanceTimersByTime(0));
    expect(navigate).toHaveBeenCalledWith("/media/game");
  });
});
