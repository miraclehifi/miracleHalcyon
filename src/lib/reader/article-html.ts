// 读者页正文后处理（reader module-spec §2 prepareArticleHtml）：在 renderMarkdown 的结果上
// 把 h1 降为 h2（页面只有标题区一个 h1）、给 h2 / h3 补 id 并提取目录、判断是否含图片；
// 正文第一个元素是段落时标记 data-dropcap（首字下沉只作用于该段）
import GithubSlugger from "github-slugger";
import type { Element, ElementContent, Root } from "hast";
import rehypeParse from "rehype-parse";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { TocItem } from "./types";

export interface PreparedArticle {
  html: string;
  toc: TocItem[];
  hasImages: boolean;
}

function textOf(node: ElementContent | Element): string {
  if (node.type === "text") return node.value;
  if (node.type === "element") return node.children.map(textOf).join("");
  return "";
}

export function prepareArticleHtml(html: string): PreparedArticle {
  const toc: TocItem[] = [];
  let hasImages = false;
  const slugger = new GithubSlugger();

  const transform = () => (tree: Root) => {
    const first = tree.children.find((child): child is Element => child.type === "element");
    if (first?.tagName === "p") first.properties = { ...first.properties, dataDropcap: "" };
    visit(tree, "element", (node) => {
      if (node.tagName === "h1") node.tagName = "h2";
      if (node.tagName === "h2" || node.tagName === "h3") {
        const text = textOf(node).replace(/\s+/g, " ").trim();
        const id = slugger.slug(text);
        node.properties = { ...node.properties, id };
        toc.push({ id, text, depth: node.tagName === "h2" ? 2 : 3 });
      }
      if (node.tagName === "figure" && node.properties?.dataArticleImage !== undefined) hasImages = true;
    });
  };

  const file = unified().use(rehypeParse, { fragment: true }).use(transform).use(rehypeStringify).processSync(html);
  return { html: String(file), toc, hasImages };
}
