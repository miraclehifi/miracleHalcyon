import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// StarRating（components.md、"评分动效参数"，admin-media.md"StarRating"）：表情星，累计点亮前 N 颗；再点当前星取消
const reduced = { value: false };
vi.mock("../../../src/lib/dom/theme", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../src/lib/dom/theme")>()),
  useReducedMotion: () => reduced.value,
}));

const { StarRating } = await import("../../../src/components/ui/StarRating");

function Controlled({ initial = null as number | null }) {
  const [value, setValue] = useState<number | null>(initial);
  return <StarRating value={value} onChange={setValue} />;
}

const stars = () => screen.getAllByRole("radio");
const lit = () => stars().map((s) => s.getAttribute("data-lit") === "");

beforeEach(() => {
  vi.useFakeTimers();
  reduced.value = false;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("StarRating 只读（sm）", () => {
  // [SC-SHELF-05][SC-SHELF-07] UT-06：4 分 → 5 颗、前 4 颗点亮；null → 不渲染
  it("4 分：5 颗星前 4 颗点亮，role=img", () => {
    render(<StarRating value={4} size="sm" readOnly />);
    const img = screen.getByRole("img", { name: "评分 4 / 5" });
    const marks = img.querySelectorAll("[data-star]");
    expect([...marks].map((m) => m.hasAttribute("data-lit"))).toEqual([true, true, true, true, false]);
  });

  it("null：不渲染", () => {
    const { container } = render(<StarRating value={null} size="sm" readOnly />);
    expect(container.innerHTML).toBe("");
  });
});

describe("StarRating 可输入（md）", () => {
  // [SC-MANAGE-05] UT-06：null → 5 颗全为占位、"未评分"
  it("未评分：5 颗占位，文字未评分", () => {
    render(<Controlled />);
    expect(screen.getByRole("radiogroup", { name: "我的评分" })).toBeTruthy();
    expect(lit()).toEqual([false, false, false, false, false]);
    expect(screen.getByText("未评分")).toBeTruthy();
    expect(stars()[0].tabIndex).toBe(0);
  });

  // [SC-MANAGE-05] 点第 3 颗 → 3 分（累计点亮）；再点当前星取消评分，焦点留在该星
  it("点选与再点取消", () => {
    render(<Controlled />);
    fireEvent.click(stars()[2]);
    expect(lit()).toEqual([true, true, true, false, false]);
    expect(stars()[2].getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("3 / 5")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(800));
    stars()[2].focus();
    fireEvent.click(stars()[2]);
    expect(lit()).toEqual([false, false, false, false, false]);
    expect(document.activeElement).toBe(stars()[2]);
  });

  // [SC-MANAGE-05] 切换动画 0.8s 内的点击被忽略；减弱动效时不锁定
  it("切换动画期间忽略点击", () => {
    render(<Controlled initial={2} />);
    fireEvent.click(stars()[4]);
    fireEvent.click(stars()[0]);
    expect(screen.getByText("5 / 5")).toBeTruthy();
    act(() => void vi.advanceTimersByTime(800));
    fireEvent.click(stars()[0]);
    expect(screen.getByText("1 / 5")).toBeTruthy();
  });

  it("减弱动效：连续点击都生效", () => {
    reduced.value = true;
    render(<Controlled initial={2} />);
    fireEvent.click(stars()[4]);
    fireEvent.click(stars()[0]);
    expect(screen.getByText("1 / 5")).toBeTruthy();
  });

  // [SC-MANAGE-05] 键盘：方向键改值、当前星可聚焦（roving tabindex）、空格在当前星上取消
  it("键盘：方向键与空格", () => {
    render(<Controlled initial={3} />);
    expect(stars().map((s) => s.tabIndex)).toEqual([-1, -1, 0, -1, -1]);
    stars()[2].focus();
    fireEvent.keyDown(stars()[2], { key: "ArrowRight" });
    expect(screen.getByText("4 / 5")).toBeTruthy();
    expect(document.activeElement).toBe(stars()[3]);
    act(() => void vi.advanceTimersByTime(800));
    fireEvent.keyDown(stars()[3], { key: "ArrowLeft" });
    act(() => void vi.advanceTimersByTime(800));
    expect(screen.getByText("3 / 5")).toBeTruthy();
    fireEvent.keyDown(stars()[2], { key: " " });
    expect(screen.getByText("未评分")).toBeTruthy();
    expect(stars()[0].tabIndex).toBe(0);
  });
});
