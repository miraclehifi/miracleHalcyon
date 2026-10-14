// 上传占位（editor module-spec §1）：源码中的 ![上传中…]() / ![处理中…]() 渲染为占位块（不出 img）；
// 文件名由预览按出现顺序补上（MarkdownPreview）。在 sanitize 之后运行，输出受信任的结构
import type { Element, Root } from "hast";
import { visit } from "unist-util-visit";

const STATES: Record<string, string> = { "上传中…": "uploading", "处理中…": "processing" };
export const PLACEHOLDER_LABELS: Record<string, string> = { uploading: "图片上传中…", processing: "图片处理中…" };
const CLASS = ["upload-placeholder", "not-prose", "my-3", "flex", "items-center", "rounded-control", "border", "border-dashed", "border-line-strong", "bg-surface-sunken", "px-4", "py-6", "text-caption", "text-ink-muted"];

export function rehypeUploadPlaceholders() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "img") return;
      const { src, alt } = node.properties;
      const state = typeof alt === "string" ? STATES[alt] : undefined;
      if (!state || (typeof src === "string" && src !== "")) return;
      node.tagName = "span";
      node.properties = { className: CLASS, dataUploadPlaceholder: state };
      node.children = [{ type: "text", value: PLACEHOLDER_LABELS[state] }];
    });
  };
}
