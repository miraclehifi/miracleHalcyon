import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleImage } from "../../../src/components/article/ArticleImage";
import { resetExternalMediaCache } from "../../../src/components/article/external-media";

// ArticleImage 外链照片（UT-173，ADR-010）：首屏缩略图，进入视口后读取主图并替换，失败保留缩略图
const STORAGE = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/";
const SRC = `${STORAGE}e2e/live.jpg`;
const THUMB = `${STORAGE}.afilmory/thumbnails/live.jpg`;

const img = () => document.querySelector("figure[data-article-image] img")!;
const frame = () => document.querySelector<HTMLElement>("figure[data-article-image] [data-status]")!;

let intersect: () => void;
let fetch: ReturnType<typeof vi.fn>;
beforeEach(() => {
  resetExternalMediaCache();
  intersect = () => {
    throw new Error("没有观察");
  };
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(private callback: (entries: { isIntersecting: boolean }[]) => void) {}
      observe() {
        intersect = () => act(() => this.callback([{ isIntersecting: true }]));
      }
      disconnect() {}
    },
  );
  fetch = vi.fn(async () => new Response(new Uint8Array(4), { status: 206 }));
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:main" }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderExternal = () => render(<ArticleImage src={SRC} alt="实况" width={960} height={1280} external={{ thumb: THUMB, mainBytes: 21119 }} />);

describe("ArticleImage 外链照片", () => {
  it("[SC-AFIL-08] 先显示缩略图；进入视口后读取一次主图并替换，状态保持 complete", async () => {
    renderExternal();
    expect(img().getAttribute("src")).toBe(THUMB);
    fireEvent.load(img());
    expect(fetch).not.toHaveBeenCalled();
    intersect();
    await vi.waitFor(() => expect(img().getAttribute("src")).toBe("blob:main"));
    expect([fetch.mock.calls.length, fetch.mock.calls[0][0], frame().dataset.status]).toEqual([1, SRC, "complete"]);
  });

  it("[SC-AFIL-12] 主图读取失败保留缩略图、不显示失败", async () => {
    fetch.mockImplementation(async () => new Response("no", { status: 500 }));
    renderExternal();
    fireEvent.load(img());
    intersect();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    await act(async () => {});
    expect([img().getAttribute("src"), frame().dataset.status]).toEqual([THUMB, "complete"]);
  });

  it("[SC-AFIL-12] 主图读到了但解码失败：退回缩略图，不显示失败", async () => {
    renderExternal();
    fireEvent.load(img());
    intersect();
    await vi.waitFor(() => expect(img().getAttribute("src")).toBe("blob:main"));
    fireEvent.error(img());
    expect([img().getAttribute("src"), frame().dataset.status]).toEqual([THUMB, "complete"]);
  });
});
