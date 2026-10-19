// 上传占位（markdown module-spec §2.1，editor module-spec §1）：源码中空地址、alt 为"处理中…"/"上传中…"/"上传失败"的图片。
// 预览（uploadPlaceholders: true）输出挂载点 [data-upload-placeholder][data-placeholder-index]（按出现顺序编号），
// 独占一个段落时替换整个段落为 div，否则为行内 span；文字由预览挂载时补上（MarkdownPreview）。
// 读者端（默认）删除占位，只剩占位的段落一并删除——失败占位会留在源码里，不能出现在已发布的文章中（US-05 AC10）。
// 在 sanitize 之后运行，输出受信任的结构
import type { Element, ElementContent, Parent, Root } from "hast";
import type { VFile } from "vfile";
import { visit, SKIP } from "unist-util-visit";

const STATES: Record<string, string> = { "上传中…": "uploading", "处理中…": "processing", "上传失败": "failed" };
export const PLACEHOLDER_LABELS: Record<string, string> = { uploading: "图片上传中…", processing: "图片处理中…", failed: "图片上传失败" };
const CLASS = ["upload-placeholder", "not-prose", "my-3", "flex", "items-center", "rounded-control", "border", "border-dashed", "border-line-strong", "bg-surface-sunken", "px-4", "py-6", "text-caption", "text-ink-muted"];

declare module "vfile" {
  interface DataMap {
    uploadPlaceholders: boolean;
  }
}

function placeholderState(node: ElementContent): string | undefined {
  if (node.type !== "element" || node.tagName !== "img") return undefined;
  const { src, alt } = node.properties;
  if (typeof src === "string" && src !== "") return undefined;
  return typeof alt === "string" ? STATES[alt] : undefined;
}

const isBlank = (node: ElementContent) => (node.type === "text" && node.value.trim() === "") || (node.type === "element" && node.tagName === "br");

export function rehypeUploadPlaceholders() {
  return (tree: Root, file: VFile) => {
    const preview = file.data.uploadPlaceholders ?? false;
    let index = 0;
    const mount = (tagName: "div" | "span", state: string): Element => ({
      type: "element",
      tagName,
      properties: { className: CLASS, dataUploadPlaceholder: state, dataPlaceholderIndex: String(index++) },
      children: [{ type: "text", value: PLACEHOLDER_LABELS[state] }],
    });
    visit(tree, "element", (node: Element, position, parent: Parent | undefined) => {
      if (!parent || position === undefined) return;
      const states = node.children.map(placeholderState);
      const only = node.tagName === "p" && states.some(Boolean) && node.children.every((child, i) => states[i] || isBlank(child));
      if (only) {
        // 段落里只有占位（可能多个，换行分隔）：整段替换为挂载点，或在读者端整段删除
        const mounts = states.flatMap((state) => (state ? [mount("div", state)] : []));
        if (mounts[0]) mounts[0].position = node.position; // 保留源码位置，同步滚动的 data-line 仍能标到这一块
        parent.children.splice(position, 1, ...(preview ? mounts : []));
        return [SKIP, position + (preview ? mounts.length : 0)];
      }
      if (!states.some(Boolean)) return;
      node.children = node.children.flatMap((child, i) => {
        const state = states[i];
        if (!state) return [child];
        return preview ? [mount("span", state)] : [];
      });
    });
  };
}
