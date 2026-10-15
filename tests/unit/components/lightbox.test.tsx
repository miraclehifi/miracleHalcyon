import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Lightbox, type LightboxImage } from "../../../src/components/reader/Lightbox";

const images: LightboxImage[] = Array.from({ length: 12 }, (_, i) => ({
  src: `/img/2026/10/aaaaaaaaaa_1600x900_556677.jpg?n=${i}`,
  alt: `图 ${i + 1}`,
  caption: i === 2 ? "第三张的图注" : undefined,
  width: 1600,
  height: 900,
}));

const dialog = () => screen.getByRole("dialog", { name: "图片查看" });
const counter = () => dialog().querySelector("[data-lightbox-counter]")!.textContent;

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

// UT-220–224（SC-LIGHTBOX-02、04、05、06）
describe("Lightbox", () => {
  it("[TC-US10-03] 初始：模态对话框、计数、图注、焦点在关闭按钮、背景锁定滚动", () => {
    render(<Lightbox images={images} index={2} onClose={() => {}} />);
    expect(dialog().getAttribute("aria-modal")).toBe("true");
    expect(counter()).toBe("3 / 12");
    expect(dialog().textContent).toContain("第三张的图注");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "关闭" }));
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("[TC-US10-05][TC-US10-06] ← / → 与按钮切换，首尾不可再切", async () => {
    render(<Lightbox images={images} index={0} onClose={() => {}} />);
    expect((screen.getByRole("button", { name: "上一张" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(dialog(), { key: "ArrowLeft" });
    expect(counter()).toBe("1 / 12");
    fireEvent.keyDown(dialog(), { key: "ArrowRight" });
    expect(counter()).toBe("2 / 12");
    fireEvent.click(screen.getByRole("button", { name: "上一张" }));
    expect(counter()).toBe("1 / 12");
  });

  // 焦点在轮播区（它自己处理方向键）时，事件冒泡到对话框不能再切一次
  it("[TC-US10-05] 焦点在轮播区时按 → 只前进一张", () => {
    render(<Lightbox images={images} index={0} onClose={() => {}} />);
    const carousel = dialog().querySelector<HTMLElement>('[aria-label="文中图片"]')!;
    fireEvent.keyDown(carousel, { key: "ArrowRight" });
    expect(counter()).toBe("2 / 12");
  });

  // 点图注、计数等不可聚焦区域时焦点落在对话框本身（tabIndex -1），Esc 与焦点陷阱仍生效
  it("[TC-US10-09] 对话框根节点可接收焦点：焦点在根节点时 Esc 关闭、Tab 进入灯箱内", () => {
    const onClose = vi.fn();
    render(<Lightbox images={images} index={0} onClose={onClose} />);
    dialog().focus();
    const focusedRoot = document.activeElement === dialog();
    fireEvent.keyDown(dialog(), { key: "Tab" });
    const afterTab = dialog().contains(document.activeElement) && document.activeElement !== dialog();
    dialog().focus();
    fireEvent.keyDown(dialog(), { key: "Escape" });
    expect({ focusedRoot, afterTab, closed: onClose.mock.calls.length }).toEqual({ focusedRoot: true, afterTab: true, closed: 1 });
  });

  it("[TC-US10-07] Esc、关闭按钮、点遮罩关闭；点图片本身不关闭；卸载后恢复滚动", () => {
    const onClose = vi.fn();
    const { unmount } = render(<Lightbox images={images} index={3} onClose={onClose} />);
    fireEvent.keyDown(dialog(), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "关闭" }));
    fireEvent.click(dialog().querySelectorAll("[data-carousel-card] img")[3]);
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(dialog()); // 根元素即遮罩（data-lightbox-backdrop）
    expect(onClose).toHaveBeenCalledTimes(3);
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("[TC-US10-07] 下滑超过 120px 关闭，不足时回弹", () => {
    const onClose = vi.fn();
    render(<Lightbox images={images} index={0} onClose={onClose} />);
    const stage = dialog().querySelector<HTMLElement>("[data-lightbox-stage]")!;
    const swipe = (dy: number, ms: number) => {
      fireEvent.pointerDown(stage, { clientX: 100, clientY: 100, pointerId: 1, timeStamp: 0 });
      fireEvent.pointerMove(stage, { clientX: 100, clientY: 100 + dy, pointerId: 1, timeStamp: ms });
      fireEvent.pointerUp(stage, { clientX: 100, clientY: 100 + dy, pointerId: 1, timeStamp: ms });
    };
    act(() => swipe(20, 1000));
    expect(onClose).not.toHaveBeenCalled();
    act(() => swipe(140, 1000));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

// UT-225–227、TC-US10-11（SC-LIGHTBOX-08、09、10）
describe("Lightbox 细节", () => {
  it("[TC-US10-09] Tab / Shift+Tab 在灯箱内循环", () => {
    render(<Lightbox images={images} index={3} onClose={() => {}} />);
    const close = screen.getByRole("button", { name: "关闭" });
    const next = screen.getByRole("button", { name: "下一张" });
    next.focus();
    fireEvent.keyDown(dialog(), { key: "Tab" });
    expect(document.activeElement).toBe(close);
    fireEvent.keyDown(dialog(), { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(next);
  });

  it("[TC-US10-10] 当前图片加载失败：提示与重试，重试后地址带 retry", () => {
    render(<Lightbox images={images} index={4} onClose={() => {}} />);
    const img = () => dialog().querySelectorAll<HTMLImageElement>("[data-carousel-card] img")[4];
    fireEvent.error(img());
    expect(screen.getByRole("alert").textContent).toContain("图片加载失败");
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(img().getAttribute("src")).toMatch(/[?&]retry=1$/);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("[TC-US10-11] 只有一张图片：计数 1 / 1，没有切换按钮，←→ 无效", () => {
    render(<Lightbox images={images.slice(0, 1)} index={0} onClose={() => {}} />);
    expect(counter()).toBe("1 / 1");
    expect(screen.queryByRole("button", { name: "上一张" })).toBeNull();
    expect(screen.queryByRole("button", { name: "下一张" })).toBeNull();
    fireEvent.keyDown(dialog(), { key: "ArrowRight" });
    expect(counter()).toBe("1 / 1");
  });

  it("[TC-US10-08] 当前图为实况照片时叠加播放层", () => {
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("probably"); // jsdom 默认返回空串（视为不支持）
    const live = [{ ...images[0], live: { videoSrc: "/img/2026/10/jjjjjjjjjj_960x1280_6b7f8e.live.mp4" } }, images[1]];
    render(<Lightbox images={live} index={0} onClose={() => {}} />);
    expect(dialog().querySelector("[data-carousel-card='0'] [data-live-badge]")).not.toBeNull();
    expect(dialog().querySelector("[data-carousel-card='1'] [data-live-badge]")).toBeNull();
  });
});
