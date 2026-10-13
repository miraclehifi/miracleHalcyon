// Post 聚合（post domain-model §2.1，ADR-002 工作稿 / 已发布快照）
import { UNTITLED, type PostContent } from "./content";
import { isValidSlug } from "./slug";

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

export type PublishField = "title" | "slug" | "body";
export type PublishCheck = { ok: true } | { ok: false; missing: PublishField[] };

// 发布校验（不变量 2）：标题不是"无标题"、slug 合法非空、正文非空白；missing 按 title、slug、body 顺序
export function validateForPublish(content: PostContent): PublishCheck {
  const missing: PublishField[] = [];
  if (content.title === UNTITLED || content.title.trim() === "") missing.push("title");
  if (!isValidSlug(content.slug)) missing.push("slug");
  if (content.body.trim() === "") missing.push("body");
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}
