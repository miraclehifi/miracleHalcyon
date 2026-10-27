import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ShelfPublicEntry } from "../../../src/domains/shelf/entry";
import { renderToString } from "react-dom/server";
import { MediaPosterWall } from "../../../src/components/reader/MediaPosterWall";
import { PlatformBadge } from "../../../src/components/reader/PlatformBadge";
import { YearBadge } from "../../../src/components/reader/YearBadge";

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
  platform: null,
  coverWidth: null,
  coverHeight: null,
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
  it("挂载后换成 Masonry 墙；正面不渲染状态徽标与名称浮层；背面不含导演", async () => {
    await renderWall([entry("进行中的片", { status: "in_progress" })]);
    expect(document.querySelector("[data-poster-wall]")).not.toBeNull();
    expect(document.querySelector("[data-poster-static]")).toBeNull();
    const face = poster("进行中的片");
    expect(face.querySelector("[data-poster-front]")!.textContent).not.toContain("在看");
    expect(face.querySelector("[data-poster-caption]")).toBeNull(); // poster-no-hover-title：正面无名称浮层
    expect(face.textContent).not.toContain("某导演");
  });

  // [poster-back-filtered-cover]
  it("背面底层铺镜像、灰度的封面（aria-hidden）；无封面或加载失败时不渲染", async () => {
    await renderWall([entry("有封面"), entry("没封面", { cover: null })]);
    const layer = poster("有封面").querySelector<HTMLImageElement>("[data-poster-back] img[data-poster-back-cover]")!;
    expect([layer.getAttribute("src"), layer.getAttribute("alt"), layer.getAttribute("aria-hidden")]).toEqual(["/covers/2026/08/shawshank2ab.jpg", "", "true"]);
    expect(layer.className).toMatch(/-scale-x-100/);
    expect(layer.className).toMatch(/grayscale/);
    expect(poster("没封面").querySelector("[data-poster-back-cover]")).toBeNull();
    fireEvent.error(layer);
    expect(poster("有封面").querySelector("[data-poster-back-cover]")).toBeNull();
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
    expect(localStorage.getItem("media:by-time")).toBe("marked");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["上个月", "本年"]);
    expect(card("肖申克的救赎").getAttribute("aria-pressed")).toBe("false");
    vi.useRealTimers();
  });

  it("电影模式不渲染平台徽标", async () => {
    await renderWall();
    expect(poster("肖申克的救赎").querySelector("[data-platform-badge]")).toBeNull();
  });

  // [UT-16][SC-SHELF-23] 分段依据：标记时间 / 发行年份（media-time-basis）
  it("依据切换：打开后出现两项，默认标记时间；选发行年份写 release 并按年份分段；关闭写 0、依据消失", async () => {
    await renderWall();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    fireEvent.click(toggle());
    const basis = screen.getByRole("radiogroup", { name: "分段依据" });
    expect(within(basis).getAllByRole("radio").map((r) => [r.textContent, r.getAttribute("aria-checked")])).toEqual([
      ["看过时间", "true"],
      ["上映年份", "false"],
    ]);
    fireEvent.keyDown(card("肖申克的救赎"), { key: "Enter" });
    fireEvent.click(within(basis).getByRole("radio", { name: "上映年份" }));
    expect(localStorage.getItem("media:by-time")).toBe("release");
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["1994"]);
    expect(card("肖申克的救赎").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle());
    expect(localStorage.getItem("media:by-time")).toBe("0");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("依据切换：方向键切换；读到 release 时默认按年份，旧值 1 按标记时间", async () => {
    localStorage.setItem("media:by-time", "release");
    await renderWall();
    expect(screen.getByRole("radio", { name: "上映年份" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(screen.getByRole("radio", { name: "上映年份" }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "看过时间" }).getAttribute("aria-checked")).toBe("true");
    expect(localStorage.getItem("media:by-time")).toBe("marked");
    cleanup();
    localStorage.setItem("media:by-time", "1");
    await renderWall();
    expect(screen.getByRole("radio", { name: "看过时间" }).getAttribute("aria-checked")).toBe("true");
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

// [UT-18][SC-SHELF-21][SC-SHELF-22] 游戏海报、PlatformBadge 与 YearBadge
describe("PlatformBadge", () => {
  it("5 种平台的文字、aria-label 与标志", () => {
    const platforms = ["ps5", "ps4", "switch", "switch2", "steam"] as const;
    const badges = platforms.map((platform) => {
      const { container } = render(<PlatformBadge platform={platform} />);
      const badge = container.querySelector<HTMLElement>("[data-platform-badge]")!;
      return [badge.textContent, badge.getAttribute("aria-label"), badge.querySelector("svg")!.getAttribute("data-icon")];
    });
    expect(badges).toEqual([
      ["PS5", "平台：PS5", "playstation"],
      ["PS4", "平台：PS4", "playstation"],
      ["Switch", "平台：Switch", "nintendoswitch"],
      ["Switch 2", "平台：Switch 2", "nintendoswitch"],
      ["Steam", "平台：Steam", "steam"],
    ]);
  });
});

describe("YearBadge", () => {
  it("只渲染年份数字，aria-hidden", () => {
    const { container } = render(<YearBadge year={2024} />);
    const badge = container.querySelector<HTMLElement>("[data-year-badge]")!;
    expect([badge.textContent, badge.getAttribute("aria-hidden")]).toEqual(["2024", "true"]);
  });
});

describe("MediaPoster 游戏模式", () => {
  const IGDB = "https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg";
  const game = (title: string, extra: Partial<ShelfPublicEntry> = {}) =>
    entry(title, { type: "game", creator: "Game Science", year: 2024, platform: "ps5", cover: IGDB, coverWidth: 810, coverHeight: 1080, ...extra });

  it("正面无名称浮层，左上角平台徽标默认隐藏（aria-hidden）；背面无平台、无开发商；翻面控件 aria-label 含平台与年份", async () => {
    await renderWall([game("黑神话：悟空")]);
    const control = screen.getByRole("button", { name: "《黑神话：悟空》，PS5，2024" });
    const face = control.closest("[data-poster]") as HTMLElement;
    expect(face.querySelector("[data-poster-caption]")).toBeNull();
    const hover = face.querySelector<HTMLElement>("[data-poster-hover]")!;
    expect(hover.getAttribute("aria-hidden")).toBe("true");
    expect(hover.className).toMatch(/opacity-0/);
    expect(hover.querySelector("[data-platform-badge]")!.textContent).toBe("PS5");
    expect(hover.querySelector("[data-year-badge]")!.textContent).toBe("2024");
    expect(face.querySelector("[data-poster-back] [data-platform-badge]")).toBeNull();
    expect(face.textContent).not.toContain("Game Science");
  });

  it("<img> 不裁切（object-contain）且带 width / height", async () => {
    await renderWall([game("黑神话：悟空")]);
    const img = document.querySelector<HTMLImageElement>("[data-poster-front] img")!;
    expect([img.getAttribute("width"), img.getAttribute("height")]).toEqual(["810", "1080"]);
    expect(img.className).toMatch(/object-contain/);
    expect(img.className).not.toMatch(/object-cover/);
  });

  it("无年份时 aria-label 只含平台、不渲染年份徽标；无封面时占位显示游戏名，平台徽标仍在", async () => {
    await renderWall([game("某款老游戏", { year: null, platform: "ps4", cover: null, coverWidth: null, coverHeight: null })]);
    const face = screen.getByRole("button", { name: "《某款老游戏》，PS4" }).closest("[data-poster]") as HTMLElement;
    expect(within(face).getByRole("img", { name: "图片不可用" }).textContent).toContain("某款老游戏");
    expect(face.querySelector("[data-poster-hover] [data-platform-badge]")!.textContent).toBe("PS4");
    expect(face.querySelector("[data-year-badge]")).toBeNull();
  });

  it("静态网格：砖块按封面比例（aspect-ratio），无封面 3 / 4", () => {
    const container = mountSlots();
    const html = renderToString(<MediaPosterWall entries={[game("黑神话：悟空"), game("老游戏", { cover: null, coverWidth: null, coverHeight: null })]} />);
    container.innerHTML = html;
    const tiles = [...container.querySelectorAll<HTMLElement>("[data-poster-static] > li")];
    expect(tiles.map((li) => li.style.aspectRatio)).toEqual(["810 / 1080", "3 / 4"]);
  });
});
