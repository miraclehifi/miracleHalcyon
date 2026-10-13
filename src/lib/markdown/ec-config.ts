// 代码高亮配置（module-spec §2）：Expressive Code + Shiki JavaScript 正则引擎，语言白名单，主题跟随站点
import type { Element, Root } from "hast";
import type { RehypeExpressiveCodeOptions } from "rehype-expressive-code";
import { visit } from "unist-util-visit";

// 语言白名单；其余语言按纯文本输出，避免运行时加载额外语法
const LANGUAGE_WHITELIST = new Set([
  "ts", "typescript", "tsx", "js", "javascript", "jsx", "json", "bash", "sh", "shell",
  "css", "html", "md", "markdown", "yaml", "yml", "toml", "sql", "python", "py",
  "go", "rust", "rs", "diff",
]);
const LANGUAGE_CLASS_PREFIX = "language-";

export function rehypeLanguageWhitelist() {
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

// 主题与站点一致（tokens.css）：默认跟随系统配色，<html data-theme="light|dark"> 强制指定。
// 亮色为基础主题；按主题类型（而非主题名）生成选择器，系统暗色时用 :root:not([data-theme='light']) 切到暗色
export const expressiveCodeOptions: RehypeExpressiveCodeOptions = {
  themes: ["github-light", "github-dark"],
  themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
  useDarkModeMediaQuery: true,
  shiki: { engine: "javascript" }, // 不用 Oniguruma WASM（ADR-001）
};
