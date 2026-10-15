// 引用署名（markdown module-spec §2 rehypeQuoteAttribution，F-002）：引用不止一段、最后一段以"— "或"—— "开头时，
// 该段改为 <footer data-attribution>（内容不变）。在 sanitize 之后执行，只改标签名、加白名单属性，不引入可注入内容
import type { Element, ElementContent, Root } from "hast";
import { visit } from "unist-util-visit";

const MARKERS = ["— ", "—— "];

const textOf = (node: ElementContent): string =>
  node.type === "text" ? node.value : node.type === "element" ? node.children.map(textOf).join("") : "";

export function rehypeQuoteAttribution() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "blockquote") return;
      const blocks = node.children.filter((child): child is Element => child.type === "element");
      const last = blocks.at(-1);
      if (blocks.length < 2 || last?.tagName !== "p" || blocks.filter((b) => b.tagName === "p").length < 2) return;
      const text = textOf(last).trimStart();
      if (!MARKERS.some((marker) => text.startsWith(marker))) return;
      last.tagName = "footer";
      last.properties = { ...last.properties, dataAttribution: "" };
    });
  };
}
