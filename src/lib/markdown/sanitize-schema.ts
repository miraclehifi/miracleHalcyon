// XSS 过滤（module-spec §2）：基于 GitHub schema，去掉 script / style / iframe 等元素、所有 on* 与 style 属性、
// javascript: 等非白名单协议；img 额外允许 data:image/*
import type { Element, Root } from "hast";
import { defaultSchema, type Options as SanitizeSchema } from "rehype-sanitize";
import { visit } from "unist-util-visit";

export const sanitizeSchema: SanitizeSchema = {
  ...defaultSchema,
  protocols: { ...defaultSchema.protocols, src: [...(defaultSchema.protocols?.src ?? []), "data"] },
};

const DATA_IMAGE = /^data:image\//i;
const CLOBBER_PREFIX = defaultSchema.clobberPrefix ?? "";

// sanitize 之后的收尾：
// 1. schema 只能按协议过滤，data: 的 MIME 在这里收紧：非 data:image/* 的 src 整个移除
// 2. sanitize 给 id 加了前缀，脚注的页内链接同步加上，否则跳转失效
export function rehypeAfterSanitize() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      const { src, href, dataFootnoteRef, dataFootnoteBackref } = node.properties;
      if (typeof src === "string" && /^\s*data:/i.test(src) && !DATA_IMAGE.test(src.trim())) delete node.properties.src;
      const isFootnoteLink = dataFootnoteRef !== undefined || dataFootnoteBackref !== undefined;
      if (isFootnoteLink && typeof href === "string" && href.startsWith("#")) node.properties.href = `#${CLOBBER_PREFIX}${href.slice(1)}`;
    });
  };
}
