import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetExternalMediaCache } from "../../../src/components/article/external-media";
import { LivePhotoLayer, resetLiveSupportCache } from "../../../src/components/article/live-photo";

// UT-174（SC-AFIL-10，ADR-010）：外链动态照片——HEVC 按 hvc1 判断；第一次播放时才按字节范围读取视频
const SRC = "https://raw.githubusercontent.com/miraclehifi/photo-assets/main/e2e/live.jpg";
const RANGE = { offset: 21119, size: 81755 };

const layer = () => document.querySelector<HTMLElement>("[data-live-photo]");
const video = () => document.querySelector("video")!;
let play: ReturnType<typeof vi.fn>;
let fetch: ReturnType<typeof vi.fn>;
let hevc: string;

beforeEach(() => {
  resetExternalMediaCache();
  resetLiveSupportCache();
  hevc = "probably";
  play = vi.fn(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play as () => Promise<void>);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockImplementation((type: string) => (type.includes("hvc1") ? hevc : "probably") as CanPlayTypeResult);
  fetch = vi.fn(async () => new Response(new Uint8Array(3), { status: 206 }));
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:video" }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const hover = async () => {
  fireEvent.pointerEnter(layer()!, { pointerType: "mouse" });
  await act(async () => void (await new Promise((resolve) => setTimeout(resolve, 350))));
};

describe("LivePhotoLayer 外链视频", () => {
  it("不支持 HEVC：不渲染播放层，不读取视频", () => {
    hevc = "";
    render(<LivePhotoLayer videoSrc={SRC} range={RANGE} codec="hevc" />);
    expect([layer(), fetch.mock.calls.length]).toEqual([null, 0]);
  });

  it("按带 profile 的 HEVC 编解码字符串判断：Chrome 对只写 hvc1 返回空串（2026-10-21 实测）", () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockImplementation((type: string) =>
      (/codecs="hvc1\.\d/.test(type) || type.includes("avc1") ? "probably" : "") as CanPlayTypeResult,
    );
    render(<LivePhotoLayer videoSrc={SRC} range={RANGE} codec="hevc" />);
    expect(layer()).not.toBeNull();
  });

  it("支持时：初始 video 无 src；第一次播放读取字节范围、设置 src 后播放；再次播放不重复读取", async () => {
    render(<LivePhotoLayer videoSrc={SRC} range={RANGE} codec="hevc" />);
    const initial = video().getAttribute("src");
    await hover();
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    const range = new Headers((fetch.mock.calls[0][1] as RequestInit).headers).get("Range");
    fireEvent.pointerLeave(layer()!, { pointerType: "mouse" });
    await hover();
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect([initial, video().getAttribute("src"), range, fetch.mock.calls.length]).toEqual([null, "blob:video", "bytes=21119-102873", 1]);
  });

  it("只改字节范围：换新的 video 元素，下次播放按新范围读取", async () => {
    const { rerender } = render(<LivePhotoLayer videoSrc={SRC} range={RANGE} codec="hevc" />);
    await hover();
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(1));
    fireEvent.pointerLeave(layer()!, { pointerType: "mouse" });
    rerender(<LivePhotoLayer videoSrc={SRC} range={{ offset: 100, size: 50 }} codec="hevc" />);
    const fresh = video().getAttribute("src");
    await hover();
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect([fresh, new Headers((fetch.mock.calls[1][1] as RequestInit).headers).get("Range")]).toEqual([null, "bytes=100-149"]);
  });

  it("读取失败：隐藏播放层", async () => {
    fetch.mockImplementation(async () => new Response("all", { status: 200 }));
    render(<LivePhotoLayer videoSrc={SRC} range={RANGE} codec="hevc" />);
    await hover();
    await vi.waitFor(() => expect(layer()).toBeNull());
    expect(play).not.toHaveBeenCalled();
  });
});
