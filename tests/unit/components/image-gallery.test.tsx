import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { galleryColumns, ImageGallery, type GalleryImage } from "../../../src/components/article/ImageGallery";

const IMAGES: GalleryImage[] = [
  { src: "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg", alt: "山", width: 1600, height: 900, accent: "#556677" },
  { src: "/img/2026/10/bbbbbbbbbb_1200x800_112233.jpg", alt: "猫", caption: "窗台上的猫", width: 1200, height: 800, accent: "#112233" },
  { src: "/img/2026/10/cccccccccc_800x1200_445566.jpg", alt: "树", width: 800, height: 1200 },
];

// 可切换的 matchMedia：change 事件按查询派发，用来验证"减弱动效"是订阅的而非只在挂载时读一次
let reduce = false;
const listeners = new Set<{ query: string; fn: () => void }>();
function stubMatchMedia() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query.includes("prefers-reduced-motion") ? reduce : false;
    },
    media: query,
    addEventListener: (_: string, fn: () => void) => listeners.add({ query, fn }),
    removeEventListener: (_: string, fn: () => void) => listeners.forEach((l) => l.fn === fn && listeners.delete(l)),
  }));
}
function setReducedMotion(value: boolean) {
  reduce = value;
  act(() => listeners.forEach((l) => l.query.includes("prefers-reduced-motion") && l.fn()));
}

// requestAnimationFrame 手动推进：每次 step 执行一帧（时间前进 16ms）
let frames: FrameRequestCallback[] = [];
let now = 0;
function step() {
  const queued = frames;
  frames = [];
  now += 16;
  queued.forEach((cb) => cb(now));
}

const grid = () => document.querySelector<HTMLElement>("[data-image-gallery=grid] > div")!;
const style = (name: string) => grid().style.getPropertyValue(name);
function pointer(type: string, pointerType: string, x: number, y: number) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  act(() => {
    grid().dispatchEvent(event);
  });
}

beforeEach(() => {
  reduce = false;
  listeners.clear();
  frames = [];
  now = 0;
  stubMatchMedia();
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ImageGallery", () => {
  it("网格列数按张数：2 张 2、3 张 3、4 张 2、5–9 张 3；手机 2–4 张 2", () => {
    const desktop = [2, 3, 4, 5, 9].map((n) => galleryColumns(n, false));
    const phone = [2, 3, 4, 5, 9].map((n) => galleryColumns(n, true));
    expect({ desktop, phone }).toEqual({ desktop: [2, 3, 2, 3, 3], phone: [2, 2, 2, 3, 3] });
  });

  it("[SC-LAYOUT-02] 平时彩色；仅鼠标在组图内时灰度聚光，触屏不触发；离开后淡回彩色", () => {
    render(<ImageGallery variant="grid" images={IMAGES} />);
    const cells = [...document.querySelectorAll<HTMLElement>("[data-gallery-item]")];
    const base = document.querySelector<HTMLElement>("[data-chroma-base]")!;
    const initial = {
      cells: cells.map((cell) => [cell.dataset.accent ?? null, cell.querySelector("[data-status]") !== null, cell.querySelector("img")!.alt]),
      filter: base.style.filter,
      power: style("--chroma-power"),
      caption: document.querySelector("figcaption")?.textContent,
      focusable: document.querySelectorAll("[data-image-gallery] button").length,
    };

    pointer("pointermove", "touch", 40, 40);
    pointer("pointerdown", "touch", 40, 40);
    step();
    const afterTouch = { power: style("--chroma-power"), queued: frames.length };

    pointer("pointermove", "mouse", 40, 40);
    for (let i = 0; i < 60; i++) step();
    const hovered = { power: style("--chroma-power"), x: style("--chroma-x") };

    pointer("pointerleave", "mouse", 40, 40);
    for (let i = 0; i < 120; i++) step();

    expect({ initial, afterTouch, hovered, left: style("--chroma-power") }).toEqual({
      initial: {
        cells: [
          ["#556677", true, "山"],
          ["#112233", true, "猫"],
          [null, true, "树"],
        ],
        filter: expect.stringContaining("var(--chroma-power, 0)"),
        power: "",
        caption: "窗台上的猫",
        focusable: 0, // 预览不传 onImageClick：卡片不可点、不可聚焦
      },
      afterTouch: { power: "", queued: 0 },
      hovered: { power: "1.0000", x: "40.00px" },
      left: "0.0000",
    });
  });

  it("prefers-reduced-motion 变化被订阅：开启后聚光直接跟随光标，无缓动", () => {
    render(<ImageGallery variant="grid" images={IMAGES} />);
    pointer("pointermove", "mouse", 10, 10);
    step();
    pointer("pointermove", "mouse", 200, 10);
    step();
    const eased = Number.parseFloat(style("--chroma-x"));
    for (let i = 0; i < 60; i++) step();

    setReducedMotion(true);
    pointer("pointermove", "mouse", 10, 10);
    step();

    expect({ eased: eased > 10 && eased < 200, snapped: style("--chroma-x") }).toEqual({ eased: true, snapped: "10.00px" });
  });
});
