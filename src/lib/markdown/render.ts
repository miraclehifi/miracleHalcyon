import rehypeExpressiveCode from "rehype-expressive-code";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype, { type Options as RemarkRehypeOptions } from "remark-rehype";
import { unified } from "unified";
import { expressiveCodeOptions, rehypeLanguageWhitelist } from "./ec-config";
import { rehypeAfterSanitize, sanitizeSchema } from "./sanitize-schema";

export interface RenderOptions {
  sourceMap?: boolean; // 预览传 true：输出源码位置属性（由后续任务实现）
}

export interface RenderResult {
  html: string;
  images: never[]; // 图片插件（ImageRef）由后续任务实现
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
  .use(rehypeLanguageWhitelist)
  .use(rehypeExpressiveCode, expressiveCodeOptions)
  .use(rehypeStringify);

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- sourceMap 由后续任务实现
export async function renderMarkdown(source: string, _opts?: RenderOptions): Promise<RenderResult> {
  const file = await processor.process(source);
  return { html: String(file), images: [] };
}
