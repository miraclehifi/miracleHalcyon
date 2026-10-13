import type { Element, Root } from "hast";
import rehypeExpressiveCode, { type RehypeExpressiveCodeOptions } from "rehype-expressive-code";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype, { type Options as RemarkRehypeOptions } from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { rehypeAfterSanitize, sanitizeSchema } from "./sanitize-schema";

export interface RenderOptions {
  sourceMap?: boolean; // 预览传 true：输出源码位置属性（由后续任务实现）
}

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

// Markdown 中的原始 HTML 先解析（rehype-raw）再统一过滤；脚注区的无障碍文案为中文（屏幕阅读器读出）
const remarkRehypeOptions: RemarkRehypeOptions = {
  allowDangerousHtml: true,
  clobberPrefix: "", // id 前缀统一由 sanitize 加（见 sanitize-schema.ts）
  footnoteLabel: "脚注",
  footnoteBackLabel: (referenceIndex, rereferenceIndex) =>
    `返回引用 ${referenceIndex + 1}${rereferenceIndex > 1 ? `-${rereferenceIndex}` : ""}`,
};

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
  .use(remarkRehype, remarkRehypeOptions)
  .use(rehypeRaw)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeAfterSanitize)
  .use(rehypeLanguageWhitelist)
  .use(rehypeExpressiveCode, expressiveCodeOptions)
  .use(rehypeStringify);

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- sourceMap 由后续任务实现
export async function renderMarkdown(source: string, _opts?: RenderOptions): Promise<RenderResult> {
  const file = await processor.process(source);
  return { html: String(file), images: [] };
}
