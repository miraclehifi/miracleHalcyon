// 同标签文章（reader module-spec §2 relatedPosts）：与本文至少共享一个标签（不区分大小写）的其他文章，
// 共享标签数降序，其后保持 sortPublished 次序（发布时间降序），最多 max 篇
import type { ReaderPost } from "./types";

export interface RelatedPost {
  post: ReaderPost;
  sharedTags: string[]; // 本文中的写法
}

const key = (tag: string) => tag.trim().toLowerCase();

export function relatedPosts(post: ReaderPost, sorted: readonly ReaderPost[], max = 8): RelatedPost[] {
  const mine = new Map(post.tags.map((tag) => [key(tag), tag]));
  return sorted
    .filter((other) => other.slug !== post.slug)
    .map((other, order) => ({ post: other, order, sharedTags: [...new Set(other.tags.map(key))].filter((k) => mine.has(k)).map((k) => mine.get(k)!) }))
    .filter((item) => item.sharedTags.length > 0)
    .sort((a, b) => b.sharedTags.length - a.sharedTags.length || a.order - b.order)
    .slice(0, max)
    .map(({ post: other, sharedTags }) => ({ post: other, sharedTags: post.tags.filter((tag) => sharedTags.includes(tag)) }));
}
