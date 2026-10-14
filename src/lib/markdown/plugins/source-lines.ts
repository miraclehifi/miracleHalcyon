// rehypeSourceLines（markdown module-spec §2）：仅 sourceMap 时，顶层块级元素加 data-line（源码起始行），供同步滚动
// 放在 sanitize 之后（作者写的 data-line 已被去掉，这里加的不受 schema 影响）；读者端渲染不传 sourceMap，输出不变。
// Expressive Code 会把顶层 <pre> 换成新的外层 div，原属性不保留：先记下（mark），代码块处理完再按顺序写回（apply）
import type { Element, Root } from "hast";
import type { VFile } from "vfile";

declare module "vfile" {
  interface DataMap {
    sourceMap: boolean;
    sourceLines: (number | null)[]; // 顶层元素按顺序的起始行（无源码位置的为 null，如脚注区）
  }
}

const topLevelElements = (tree: Root) => tree.children.filter((node): node is Element => node.type === "element");

export function rehypeSourceLinesMark() {
  return (tree: Root, file: VFile) => {
    if (!file.data.sourceMap) return;
    file.data.sourceLines = topLevelElements(tree).map((node) => node.position?.start.line ?? null);
  };
}

export function rehypeSourceLinesApply() {
  return (tree: Root, file: VFile) => {
    const lines = file.data.sourceLines;
    if (!lines) return;
    const elements = topLevelElements(tree);
    if (elements.length !== lines.length) return; // 结构被改变：宁可不标，也不标错
    elements.forEach((node, i) => {
      if (lines[i] !== null) node.properties.dataLine = lines[i];
    });
  };
}
