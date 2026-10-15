// 列表卡片模型与分页地址（reader-post-list.md）
import { excerptOf } from "./excerpt";
import { tagSlug } from "./tags";
import type { CardModel, ReaderPost } from "./types";

// 第 1 页只有基础地址（/posts、/tags/x），第 n 页为 {base}/page/n
export const listHref = (base: string, page: number): string => (page <= 1 ? base : `${base}/page/${page}`);

export function toCardModel(post: ReaderPost): CardModel {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: excerptOf(post),
    publishedAt: post.publishedAt,
    tags: post.tags.map((name) => ({ name, slug: tagSlug(name) })),
    cover: post.cover,
  };
}
