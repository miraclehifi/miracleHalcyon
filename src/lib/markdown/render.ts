import rehypeExpressiveCode from "rehype-expressive-code";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype, { type Options as RemarkRehypeOptions } from "remark-rehype";
import { unified } from "unified";
import { expressiveCodeOptions, rehypeLanguageWhitelist } from "./ec-config";
import { rehypeImageFigures, type ImageRef } from "./plugins/image-figures";
import { rehypeQuoteAttribution } from "./plugins/quote-attribution";
import { rehypeSourceLinesApply, rehypeSourceLinesMark } from "./plugins/source-lines";
import { rehypeUploadPlaceholders } from "./plugins/upload-placeholder";
import { rehypeAfterSanitize, sanitizeSchema } from "./sanitize-schema";

export interface RenderOptions {
  sourceMap?: boolean; // 预览传 true：顶层块输出 data-line（同步滚动）
}

export type { ImageRef } from "./plugins/image-figures";
export { parseImageKey, parseMarks } from "./plugins/image-key";

export interface RenderResult {
  html: string;
  images: ImageRef[]; // 预览用于挂载 ArticleImage / ImageGallery
}

// Markdown 中的原始 HTML 先解析（rehype-raw）再统一过滤；脚注区的无障碍文案为中文（屏幕阅读器读出）
const remarkRehypeOptions: RemarkRehypeOptions = {
  allowDangerousHtml: true,
  clobberPrefix: "", // id 前缀统一由 sanitize 加（见 sanitize-schema.ts）
  footnoteLabel: "脚注",
  footnoteBackLabel: (referenceIndex, rereferenceIndex) =>
    `返回引用 ${referenceIndex + 1}${rereferenceIndex > 1 ? `-${rereferenceIndex}` : ""}`,
};

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, remarkRehypeOptions)
  .use(rehypeRaw)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeAfterSanitize)
  .use(rehypeQuoteAttribution)
  .use(rehypeUploadPlaceholders)
  .use(rehypeImageFigures)
  .use(rehypeSourceLinesMark)
  .use(rehypeLanguageWhitelist)
  .use(rehypeExpressiveCode, expressiveCodeOptions)
  .use(rehypeSourceLinesApply)
  .use(rehypeStringify);

export async function renderMarkdown(source: string, opts: RenderOptions = {}): Promise<RenderResult> {
  const file = await processor.process({ value: source, data: { sourceMap: opts.sourceMap ?? false } });
  return { html: String(file), images: file.data.images ?? [] };
}
