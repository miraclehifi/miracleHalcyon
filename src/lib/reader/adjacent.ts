// 上一篇 / 下一篇（reader module-spec §2 adjacentPosts）：在 sortPublished 序列（新 → 旧）中，
// 上一篇 = 更早发布（后一项），下一篇 = 更新发布（前一项）
import type { ReaderPost } from "./types";

export function adjacentPosts(slug: string, sorted: readonly ReaderPost[]): { prev: ReaderPost | null; next: ReaderPost | null } {
  const i = sorted.findIndex((post) => post.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return { prev: sorted[i + 1] ?? null, next: sorted[i - 1] ?? null };
}
