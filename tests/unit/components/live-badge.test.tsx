import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { ArticleImage } from "../../../src/components/article/ArticleImage";

const SRC = "/img/2026/10/jjjjjjjjjj_960x1280_6b7f8e.jpg";
const VIDEO = "/img/2026/10/jjjjjjjjjj_960x1280_6b7f8e.live.mp4";

const figure = () => document.querySelector<HTMLElement>("figure[data-article-image]")!;
const layer = () => figure().querySelector<HTMLElement>("[data-live-photo]");
const video = () => figure().querySelector("video")!;
const badge = () => figure().querySelector<HTMLElement>("[data-live-badge]");

let play: Mock<() => Promise<void>>;
let pause: Mock<() => void>;

beforeEach(() => {
  vi.useFakeTimers();
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
  vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("probably");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function renderLoaded() {
  render(<ArticleImage src={SRC} alt="实况" width={960} height={1280} live={{ videoSrc: VIDEO }} />);
  const beforeLoad = layer();
  fireEvent.load(figure().querySelector("img")!);
  return beforeLoad;
}

// UT-147（SC-LIVE-10、SC-LIVE-11）
describe("LiveBadge 与实况照片播放", () => {
  it("图片加载完成后才显示；视频静音、内联、不循环、不预加载；悬停 0.3s 后播放，离开暂停并归零", () => {
    const beforeLoad = renderLoaded();
    const attrs = { src: video().getAttribute("src"), muted: video().muted, inline: video().playsInline, loop: video().loop, preload: video().preload };

    fireEvent.pointerEnter(layer()!, { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(299));
    const early = play.mock.calls.length;
    act(() => vi.advanceTimersByTime(1));
    fireEvent.playing(video());
    const playingBadge = badge()!.hasAttribute("data-playing");

    video().currentTime = 1.2;
    fireEvent.pointerLeave(layer()!, { pointerType: "mouse" });

    expect({
      beforeLoad,
      attrs,
      early,
      played: play.mock.calls.length,
      playingBadge,
      paused: pause.mock.calls.length,
      time: video().currentTime,
      after: badge()!.hasAttribute("data-playing"),
    }).toEqual({
      beforeLoad: null,
      attrs: { src: VIDEO, muted: true, inline: true, loop: false, preload: "none" },
      early: 0,
      played: 1,
      playingBadge: true,
      paused: 1,
      time: 0,
      after: false,
    });
  });

  it("触屏长按播放、松手复原；轻触不播放；阻止系统长按菜单", () => {
    renderLoaded();
    fireEvent.pointerDown(layer()!, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(100));
    fireEvent.pointerUp(layer()!, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(500));
    const afterTap = play.mock.calls.length;

    fireEvent.pointerDown(layer()!, { pointerType: "touch" });
    act(() => vi.advanceTimersByTime(300));
    const afterHold = play.mock.calls.length;
    fireEvent.pointerUp(layer()!, { pointerType: "touch" });
    const menuAllowed = fireEvent.contextMenu(layer()!);

    expect({ afterTap, afterHold, paused: pause.mock.calls.length, menuAllowed }).toEqual({ afterTap: 0, afterHold: 1, paused: 2, menuAllowed: false });
  });

  it("视频 error 后隐藏 LIVE，悬停不再播放", () => {
    renderLoaded();
    const shown = badge() !== null;
    fireEvent.error(video());
    const afterError = { badge: badge(), layer: layer() };
    fireEvent.pointerEnter(figure(), { pointerType: "mouse" });
    act(() => vi.advanceTimersByTime(1000));

    expect({ shown, afterError, played: play.mock.calls.length }).toEqual({ shown: true, afterError: { badge: null, layer: null }, played: 0 });
  });
});
