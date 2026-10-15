// 读者页构建期数据（reader module-spec §1.1）；ReaderPost = 公开接口的 PublishedPost
export interface ReaderPost {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  publishedAt: string; // yyyy-MM-dd
  lastPublishedAt: string; // ISO 8601 UTC
  body: string; // Markdown 原文
  cover: string | null;
}

export interface ReaderData {
  posts: ReaderPost[]; // 已按 sortPublished 排序
}

export interface TagLink {
  name: string; // 该文章中的原写法
  slug: string;
}

export interface CardModel {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  tags: TagLink[];
  cover: string | null;
}

export interface TagGroup {
  slug: string;
  name: string;
  count: number;
  posts: ReaderPost[];
}

export interface TocItem {
  id: string;
  text: string;
  depth: 2 | 3;
}
