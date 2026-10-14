import { describe, expect, it } from "vitest";
import { islandKey, reconcileIslands } from "../../../src/lib/markdown/reconcile-islands";
import type { ImageRef } from "../../../src/lib/markdown/render";

const image = (src: string, marks: Partial<ImageRef["marks"]> = {}, extra: Partial<ImageRef> = {}): ImageRef => ({
  id: "img-0",
  src,
  alt: "",
  marks: { wide: false, live: false, accordion: false, ...marks },
  sourceStart: 0,
  sourceEnd: 0,
  ...extra,
});

// [SC-LAYOUT-13] UT-140：两次渲染中 src 和标记都相同的图片复用原实例；src 变化的重新挂载；被删除的卸载
describe("reconcileIslands", () => {
  it("src 与标记相同的复用（与位置、alt、图注无关），src 或标记变化的重新挂载，多出的卸载", () => {
    const prev = [image("/a.jpg"), image("/b.jpg"), image("/c.jpg", { wide: true }), image("/d.jpg")].map(islandKey);
    const next = [
      image("/new.jpg"), // 新插入在最前
      image("/a.jpg", {}, { alt: "改了 alt", title: "新图注", sourceStart: 99 }),
      image("/b2.jpg"), // src 变化
      image("/c.jpg"), // 去掉 wide
    ].map(islandKey);

    expect(reconcileIslands(prev, next)).toEqual({ matches: [null, 0, null, null], removed: [1, 2, 3] });
  });

  it("同一张图出现多次时按出现顺序一一对应，不重复复用", () => {
    const prev = ["/a.jpg", "/a.jpg"].map((src) => islandKey(image(src)));
    const next = ["/a.jpg", "/a.jpg", "/a.jpg"].map((src) => islandKey(image(src)));

    expect(reconcileIslands(prev, next)).toEqual({ matches: [0, 1, null], removed: [] });
  });

  it("wide、live、accordion 任一标记不同都视为不同实例", () => {
    const keys = [{}, { wide: true }, { live: true }, { accordion: true }].map((marks) => islandKey(image("/a.jpg", marks)));

    expect(new Set(keys).size).toBe(4);
  });
});
