import type { Element, Root } from "hast";
import rehypeExpressiveCode, { type RehypeExpressiveCodeOptions } from "rehype-expressive-code";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export interface RenderResult {
  html: string;
  images: never[]; // 图片插件（ImageRef）由后续任务实现
}

// 语言白名单（module-spec §2）；其余语言按纯文本输出，避免运行时加载额外语法
const LANGUAGE_WHITELIST = new Set([
  "ts", "typescript", "tsx", "js", "javascript", "jsx", "json", "bash", "sh", "shell",
  "css", "html", "md", "markdown", "yaml", "yml", "toml", "sql", "python", "py",
  "go", "rust", "rs", "diff",
]);
const LANGUAGE_CLASS_PREFIX = "language-";

const expressiveCodeOptions: RehypeExpressiveCodeOptions = {
  themes: ["github-dark", "github-light"],
  shiki: { engine: "javascript" }, // 不用 Oniguruma WASM（ADR-001）
};

function rehypeLanguageWhitelist() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName !== "code" || !Array.isArray(node.properties.className)) return;
      node.properties.className = node.properties.className.filter((name) => {
        const cls = String(name);
        return !cls.startsWith(LANGUAGE_CLASS_PREFIX) || LANGUAGE_WHITELIST.has(cls.slice(LANGUAGE_CLASS_PREFIX.length));
      });
    });
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeLanguageWhitelist)
  .use(rehypeExpressiveCode, expressiveCodeOptions)
  .use(rehypeStringify);

export async function renderMarkdown(source: string): Promise<RenderResult> {
  const file = await processor.process(source);
  return { html: String(file), images: [] };
}
