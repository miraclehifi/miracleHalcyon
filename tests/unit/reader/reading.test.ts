import { afterEach, describe, expect, it, vi } from "vitest";
import { bindTocLinks, currentHeading, progressOf } from "../../../src/components/reader/reading";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

// [TC-US08-04][SC-SIDEBAR-04] UT-213 / READER-UT-11
describe("progressOf", () => {
  it("正文顶部到达视口顶部之前为 0，正文底部进入视口为 100，中间线性并取整", () => {
    const at = (scrollY: number) => progressOf(scrollY, 300, 3000, 900);
    expect([at(0), at(300), at(1350), at(2400), at(5000)]).toEqual([0, 0, 50, 100, 100]);
  });

  it("正文比视口短时直接 100", () => {
    expect(progressOf(0, 100, 500, 900)).toBe(100);
  });
});

// [TC-US08-05][SC-SIDEBAR-05] UT-214
describe("currentHeading", () => {
  it("最后一个越过阅读线的标题；都未越过时为第一个", () => {
    expect(currentHeading([100, 400, 900], 270)).toBe(0);
    expect(currentHeading([-500, -100, 600], 270)).toBe(1);
    expect(currentHeading([500, 800], 270)).toBe(0);
    expect(currentHeading([], 270)).toBe(-1);
  });
});

// [TC-US08-05][TC-US08-06][SC-SIDEBAR-05][SC-SIDEBAR-06] UT-215
describe("bindTocLinks", () => {
  function setup(reduced: boolean) {
    document.body.innerHTML = '<nav><a href="#安装">安装</a></nav><h2 id="安装">安装</h2>';
    const target = document.getElementById("安装")!;
    target.scrollIntoView = vi.fn();
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({ matches: reduced && query.includes("reduce"), media: query }) as MediaQueryList);
    const replace = vi.spyOn(history, "replaceState");
    bindTocLinks(document.querySelector("nav")!);
    document.querySelector("a")!.click();
    return { target, replace };
  }

  it("平滑滚动到标题并更新地址 hash", () => {
    const { target, replace } = setup(false);
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(replace).toHaveBeenCalledWith(null, "", "#安装");
  });

  it("减弱动效时直接跳转", () => {
    const { target } = setup(true);
    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });
});
