// 排序与分页（reader module-spec §2）
import type { ReaderPost } from "./types";

export const PAGE_SIZE = 20;

// 与公开列表 SQL 一致（publishedAt、lastPublishedAt 降序），最后按 slug 升序保证确定性
export function sortPublished(posts: readonly ReaderPost[]): ReaderPost[] {
  return [...posts].sort(
    (a, b) =>
      b.publishedAt.localeCompare(a.publishedAt) ||
      b.lastPublishedAt.localeCompare(a.lastPublishedAt) ||
      a.slug.localeCompare(b.slug),
  );
}

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  from: number; // 第几篇起（1 起）；空列表为 0
  to: number;
}

export function paginate<T>(items: readonly T[], page: number, size = PAGE_SIZE): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const slice = items.slice((page - 1) * size, page * size);
  const from = slice.length ? (page - 1) * size + 1 : 0;
  return { items: slice, page, totalPages, total, from, to: from ? from + slice.length - 1 : 0 };
}

// 第 1 页只有 /posts，不生成 /posts/page/1
export function pagePaths(total: number, size = PAGE_SIZE): number[] {
  const totalPages = Math.ceil(total / size);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => i + 2);
}
