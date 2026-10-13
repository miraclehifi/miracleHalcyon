// PostContent 值对象（post domain-model §2.2、§3）：规范化 + 校验，出错时一次报出全部字段
import { ValidationError } from "./errors";
import { isValidSlug } from "./slug";

export const UNTITLED = "无标题";
const TITLE_MAX = 200;
const SUMMARY_MAX = 200;
const BODY_MAX = 200_000;
const TAGS_MAX = 10;
const TAG_MAX = 32;
const PUBLISH_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// 客户端每次发送整份工作稿；字段类型由 API 层校验
export interface DraftInput {
  title: string;
  slug: string;
  tags: string[];
  summary: string;
  body: string;
  publishedAt: string | null;
}

export type PostContent = Readonly<DraftInput>;

// 字符数按 Unicode 码点计
const length = (value: string) => [...value].length;

function isValidTag(tag: string): boolean {
  return length(tag) >= 1 && length(tag) <= TAG_MAX && !/[,\r\n]/.test(tag);
}

// 去首尾空白、去重（不区分大小写，保留首次出现的写法）
function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function isValidPublishDate(value: string): boolean {
  const match = PUBLISH_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function normalizeContent(input: DraftInput): PostContent {
  const content: PostContent = {
    title: input.title.trim() || UNTITLED,
    slug: input.slug.trim(),
    tags: normalizeTags(input.tags),
    summary: input.summary.trim(),
    body: input.body,
    publishedAt: input.publishedAt,
  };

  const invalid: Record<keyof DraftInput, boolean> = {
    title: length(content.title) > TITLE_MAX,
    slug: content.slug !== "" && !isValidSlug(content.slug),
    tags: content.tags.length > TAGS_MAX || !content.tags.every(isValidTag),
    summary: length(content.summary) > SUMMARY_MAX,
    body: content.body.length > BODY_MAX,
    publishedAt: content.publishedAt !== null && !isValidPublishDate(content.publishedAt),
  };
  const fields = (Object.keys(invalid) as (keyof DraftInput)[]).filter((field) => invalid[field]);
  if (fields.length > 0) throw new ValidationError(fields);
  return content;
}
