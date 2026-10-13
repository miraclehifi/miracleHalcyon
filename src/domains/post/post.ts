// Post 聚合（post domain-model §2.1，ADR-002 工作稿 / 已发布快照）
import type { PostContent } from "./content";

export type PostId = number;
export type PostStatus = "draft" | "published";

export interface Post {
  id: PostId;
  draft: PostContent; // 工作稿：自动保存只改这里
  draftHash: string;
  published: PostContent | null; // 已发布快照；null = 草稿
  pubHash: string | null;
  lastPublishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date; // 最近一次工作稿保存时间
}

export interface DerivedStatus {
  status: PostStatus;
  hasUnpublishedChanges: boolean;
}

// 用内容哈希判断"有未发布修改"：改了又改回来不会误判
export function deriveStatus(post: Pick<Post, "draftHash" | "pubHash">): DerivedStatus {
  if (post.pubHash === null) return { status: "draft", hasUnpublishedChanges: false };
  return { status: "published", hasUnpublishedChanges: post.pubHash !== post.draftHash };
}
