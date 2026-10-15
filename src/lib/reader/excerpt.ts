// 纯文本提取（reader module-spec §2 plainText）：摘要与字数用，不走完整渲染
import type { Nodes, Parent } from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const parser = unified().use(remarkParse).use(remarkGfm);
const SKIP = new Set(["image", "imageReference", "code", "html", "definition", "footnoteDefinition"]);
// 行内容器：子节点直接相连；其余（块级）之间用空格分隔
const PHRASING_PARENTS = new Set(["paragraph", "heading", "emphasis", "strong", "delete", "link", "linkReference", "tableCell"]);

function text(node: Nodes): string {
  if (SKIP.has(node.type)) return "";
  if ("value" in node && typeof node.value === "string") return node.value;
  if (!("children" in node)) return "";
  const parts = (node as Parent).children.map((child) => text(child as Nodes));
  return PHRASING_PARENTS.has(node.type) ? parts.join("") : parts.filter((p) => p.trim()).join(" ");
}

export function plainText(markdown: string): string {
  return text(parser.parse(markdown)).replace(/\s+/g, " ").trim();
}

const EXCERPT_LENGTH = 120;

// 列表卡片摘要（reader-post-list.md"文章卡片"）：有 summary 用 summary；否则取正文纯文本前 120 个字符（码点），超出加"…"
export function excerptOf(post: { summary: string; body: string }): string {
  const summary = post.summary.trim();
  if (summary) return summary;
  const chars = [...plainText(post.body)];
  return chars.length > EXCERPT_LENGTH ? `${chars.slice(0, EXCERPT_LENGTH).join("").trimEnd()}…` : chars.join("");
}
