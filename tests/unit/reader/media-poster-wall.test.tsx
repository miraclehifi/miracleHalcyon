import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShelfPublicEntry } from "../../../src/domains/shelf/entry";
import { MediaPosterWall } from "../../../src/components/reader/MediaPosterWall";

// MediaPosterWall / MediaPoster（components.md"海报墙参数"，UT-16）。jsdom 量不到宽度：打桩 getBoundingClientRect 让 Masonry 排出砖块；
// 无 IntersectionObserver 时 Masonry 直接入场
const entry = (title: string, extra: Partial<ShelfPublicEntry> = {}): ShelfPublicEntry => ({
  type: "movie",
  title,
  creator: "某导演",
  year: 1994,
  status: "completed",
  rating: 5,
  markedOn: "2026-08-20",
  comment: "短评",
  cover: "/covers/2026/08/shawshank2ab.jpg",
  doubanUrl: "https://movie.douban.com/subject/1292052/",
  ...extra,
});
const ENTRIES = [entry("肖申克的救赎"), entry("无名片", { rating: null, doubanUrl: null, creator: null, markedOn: "2026-07-01" })];

function mountSlots() {
  document.body.innerHTML = '<div data-time-toggle-slot="desktop"></div><div data-time-toggle-slot="mobile"></div><div id="root"></div>';
  return document.getElementById("root")!;
}

async function renderWall(entries = ENTRIES) {
  const container = mountSlots();
  const view = render(<MediaPosterWall entries={entries} />, { container });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return view;
}

const card = (title: string) => screen.getByRole("button", { name: `《${title}》` });
const poster = (title: string) => card(title).closest("[data-poster]") as HTMLElement;
const douban = (title: string) => poster(title).querySelector<HTMLAnchorElement>("a[data-douban-link]");
const toggle = () => screen.getByRole("button", { name: "按时间" });

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ x: 0, y: 0, top: 0, left: 0, right: 1340, bottom: 800, width: 1340, height: 800, toJSON: () => ({}) });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// [UT-16][SC-SHELF-19][SC-SHELF-20]
describe("MediaPosterWall", () => {
  it("挂载后换成 Masonry 墙；正面不渲染状态徽标；背面不含导演", async () => {
    await renderWall([entry("进行中的片", { status: "in_progress" })]);
    expect(document.querySelector("[data-poster-wall]")).not.toBeNull();
    expect(document.querySelector("[data-poster-static]")).toBeNull();
    const face = poster("进行中的片");
    expect(face.querySelector("[data-poster-front]")!.textContent).not.toContain("在看");
    expect(face.textContent).not.toContain("某导演");
  });

  it("同一时间只翻开一张；Esc 翻回", async () => {
    await renderWall();
    fireEvent.keyDown(card("肖申克的救赎"), { key: "Enter" });
    expect(card("肖申克的救赎").getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(card("无名片"), { key: "Enter" });
    expect(card("无名片").getAttribute("aria-pressed")).toBe("true");
    expect(card("肖申克的救赎").getAttribute("aria-pressed")).toBe("false");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(card("无名片").getAttribute("aria-pressed")).toBe("false");
  });

  it("豆瓣链接：未翻开时不可聚焦且 aria-hidden，翻开后可聚焦；无链接不渲染", async () => {
    await renderWall();
    const link = douban("肖申克的救赎")!;
    expect([link.tabIndex, link.getAttribute("aria-hidden"), link.target, link.rel]).toEqual([-1, "true", "_blank", "noopener noreferrer"]);
    fireEvent.keyDown(card("肖申克的救赎"), { key: " " });
    expect([douban("肖申克的救赎")!.tabIndex, douban("肖申克的救赎")!.hasAttribute("aria-hidden")]).toEqual([0, false]);
    expect(douban("无名片")).toBeNull();
  });

  it("按时间：切换 aria-pressed、写 localStorage、出现分段标题；切换时翻开的海报翻回", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 15, 10));
    await renderWall();
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    fireEvent.keyDown(card("肖申克的救赎"), { key: "Enter" });
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect(localStorage.getItem("media:by-time")).toBe("1");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["上个月", "本年"]);
    expect(card("肖申克的救赎").getAttribute("aria-pressed")).toBe("false");
    vi.useRealTimers();
  });

  it("按钮挂到桌面槽；localStorage 读到 1 时默认分段，抛错时按关闭", async () => {
    const desktop = (query: string) => ({ matches: query === "(min-width: 768px)", media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
    vi.spyOn(window, "matchMedia").mockImplementation(desktop);
    localStorage.setItem("media:by-time", "1");
    await renderWall();
    const slot = document.querySelector('[data-time-toggle-slot="desktop"]') as HTMLElement;
    expect(within(slot).getByRole("button", { name: "按时间" }).getAttribute("aria-pressed")).toBe("true");
    cleanup();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await renderWall();
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
  });
});
