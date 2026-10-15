import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ArticleImage } from "../../../src/components/article/ArticleImage";

const SRC = "/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg";

const figure = () => document.querySelector<HTMLElement>("figure[data-article-image]")!;
const frame = () => figure().querySelector<HTMLElement>("[data-status]")!;
const img = () => figure().querySelector("img")!;
const liveText = () => screen.getByRole("status").textContent;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubReducedMotion() {
  const real = window.matchMedia;
  vi.stubGlobal("matchMedia", (query: string) => ({ ...real(query), matches: query.includes("prefers-reduced-motion") }));
}

// image-refine-loading 验收；US-12 BH-01 / BH-06（宽图、图注、按宽高比预留空间）
describe("ArticleImage", () => {
  it("[SC-LAYOUT-01][SC-LAYOUT-06] 按宽高比预留空间；wide 标在根节点；title 作为图注；无宽高时不预留比例", () => {
    render(<ArticleImage src={SRC} alt="山" caption="窗外的山" width={1600} height={900} wide />);
    const first = {
      wide: figure().hasAttribute("data-wide"),
      aspect: frame().style.getPropertyValue("--rf-aspect"),
      caption: figure().querySelector("figcaption")?.textContent,
      size: [img().getAttribute("width"), img().getAttribute("height"), img().getAttribute("loading"), img().getAttribute("decoding")],
    };
    cleanup();
    render(<ArticleImage src="https://example.com/a.png" alt="a" />);
    const external = { wide: figure().hasAttribute("data-wide"), aspect: frame().style.getPropertyValue("--rf-aspect"), caption: figure().querySelector("figcaption") };

    expect({ first, external }).toEqual({
      first: { wide: true, aspect: "1600 / 900", caption: "窗外的山", size: ["1600", "900", "lazy", "async"] },
      external: { wide: false, aspect: "", caption: null },
    });
  });

  it("读屏读到图片 alt 而非加载状态；加载中、加载完成都不播报，只有失败时播报", () => {
    render(<ArticleImage src={SRC} alt="山" width={1600} height={900} />);
    const loading = { img: screen.queryByRole("img", { name: "山" }) !== null, busyLabel: screen.queryByRole("img", { name: "加载中" }), live: liveText(), flag: figure().hasAttribute("data-loading") };
    fireEvent.load(img());
    const loaded = { live: liveText(), flag: figure().hasAttribute("data-loading") };
    cleanup();
    render(<ArticleImage src={SRC} alt="山" width={1600} height={900} />);
    fireEvent.error(img());
    const failed = { live: liveText(), flag: figure().hasAttribute("data-loading") };

    expect({ loading, loaded, failed }).toEqual({
      loading: { img: true, busyLabel: null, live: "", flag: true },
      loaded: { live: "", flag: false },
      failed: { live: "加载失败", flag: false },
    });
  });

  it("失败后显示重试按钮（全站焦点环、触屏 44px），点击后回到加载中并带 ?retry=n 重新请求", () => {
    render(<ArticleImage src={SRC} alt="山" width={1600} height={900} />);
    fireEvent.error(img());
    const button = screen.getByRole("button", { name: "重试" });
    const style = { noOutlineReset: !button.className.includes("outline-none"), touch44: button.className.includes("pointer:coarse") && button.className.includes("h-11") };
    fireEvent.click(button);
    const first = { src: img().getAttribute("src"), status: frame().dataset.status, button: screen.queryByRole("button", { name: "重试" }) };
    fireEvent.error(img());
    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    expect({ style, first, second: img().getAttribute("src") }).toEqual({
      style: { noOutlineReset: true, touch44: true },
      first: { src: `${SRC}?retry=1`, status: "generating", button: null },
      second: `${SRC}?retry=2`,
    });
  });

  it("prefers-reduced-motion：加载中无扫光，加载后不启用马赛克画布（只做透明度渐显）", () => {
    render(<ArticleImage src={SRC} alt="山" width={1600} height={900} />);
    const normal = frame().hasAttribute("data-sweep");
    cleanup();
    stubReducedMotion();
    render(<ArticleImage src={SRC} alt="山" width={1600} height={900} />);
    const sweep = frame().hasAttribute("data-sweep");
    Object.defineProperty(img(), "naturalWidth", { value: 1600 });
    fireEvent.load(img());

    expect({ normal, sweep, mosaic: frame().hasAttribute("data-mosaic"), status: frame().dataset.status }).toEqual({
      normal: true,
      sweep: false,
      mosaic: false,
      status: "complete",
    });
  });
});

// F-002 hydrate-article-images：读者页传 onClick 打开灯箱；不传时结构不变（预览）
describe("ArticleImage onClick", () => {
  it("[SC-LIGHTBOX-02] 不传 onClick 时没有按钮语义", () => {
    render(<ArticleImage src={SRC} alt="山" width={1600} height={900} />);
    expect(screen.queryByRole("button", { name: /查看大图/ })).toBeNull();
  });

  it("[SC-LIGHTBOX-02] 传 onClick 时图片区为按钮：点击与 Enter 触发；加载失败时不触发", () => {
    const onClick = vi.fn();
    render(<ArticleImage src={SRC} alt="山" width={1600} height={900} onClick={onClick} />);
    const button = screen.getByRole("button", { name: "查看大图：山" });
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Enter" });
    expect(onClick).toHaveBeenCalledTimes(2);
    fireEvent.error(img());
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
