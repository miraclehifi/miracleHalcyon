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
