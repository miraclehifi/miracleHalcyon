import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AccordionGallery from "../../../src/components/vendor/react-bits/AccordionGallery";

// 手风琴面板键盘可打开灯箱（reader-post-detail.md"图片可聚焦…Enter 打开"，SC-LIGHTBOX-03）
const items = ["a", "b", "c"].map((name) => ({ image: `/img/2026/10/${name}aaaaaaaaa_1x1_808080.png`, alt: name }));

afterEach(cleanup);

describe("AccordionGallery 键盘", () => {
  it("[SC-LIGHTBOX-03] 聚焦面板后 Enter / 空格调用 onActiveClick；方向键只切换展开项", () => {
    const onActiveClick = vi.fn();
    render(<AccordionGallery items={items} onActiveClick={onActiveClick} ariaLabel="组图" />);
    const panels = screen.getAllByRole("listitem");
    fireEvent.focus(panels[1]);
    fireEvent.keyDown(panels[1], { key: "Enter" });
    fireEvent.keyDown(panels[1], { key: " " });
    fireEvent.keyDown(panels[1], { key: "ArrowRight" });
    expect(onActiveClick.mock.calls).toEqual([[1], [1]]);
  });
});
