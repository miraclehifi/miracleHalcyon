// PostRepo（post domain-model §5，data-model posts 表）；delete / list / tags 由后续任务补充
import type { PostContent } from "./content";
import type { Post, PostId } from "./post";

export interface NewPostRow {
  draft: PostContent;
  draftHash: string;
  createdAt: Date; // 同时作为首次 updatedAt
}

export interface PostRepo {
  insert(row: NewPostRow): Promise<PostId>;
  get(id: PostId): Promise<Post | null>;
  updateDraft(id: PostId, content: PostContent, draftHash: string, now: Date): Promise<boolean>; // false = 不存在
  setPublished(id: PostId, content: PostContent | null, pubHash: string | null, at: Date | null): Promise<boolean>;
  slugTaken(slug: string, exceptId?: PostId): Promise<boolean>;
}

interface PostRow {
  id: number;
  title: string;
  slug: string;
  tags: string;
  summary: string;
  body: string;
  published_at: string | null;
  draft_hash: string;
  pub_title: string | null;
  pub_slug: string | null;
  pub_tags: string | null;
  pub_summary: string | null;
  pub_body: string | null;
  pub_published_at: string | null;
  pub_hash: string | null;
  last_published_at: string | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS =
  "id, title, slug, tags, summary, body, published_at, draft_hash, pub_title, pub_slug, pub_tags, pub_summary, pub_body, pub_published_at, pub_hash, last_published_at, created_at, updated_at";

const toDate = (value: string | null) => (value === null ? null : new Date(value));

function toPost(row: PostRow): Post {
  const published: PostContent | null =
    row.pub_hash === null
      ? null
      : {
          title: row.pub_title ?? "",
          slug: row.pub_slug ?? "",
          tags: JSON.parse(row.pub_tags ?? "[]") as string[],
          summary: row.pub_summary ?? "",
          body: row.pub_body ?? "",
          publishedAt: row.pub_published_at,
        };
  return {
    id: row.id,
    draft: {
      title: row.title,
      slug: row.slug,
      tags: JSON.parse(row.tags) as string[],
      summary: row.summary,
      body: row.body,
      publishedAt: row.published_at,
    },
    draftHash: row.draft_hash,
    published,
    pubHash: row.pub_hash,
    lastPublishedAt: toDate(row.last_published_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class D1PostRepo implements PostRepo {
  constructor(private readonly db: D1Database) {}

  async insert({ draft, draftHash, createdAt }: NewPostRow): Promise<PostId> {
    const at = createdAt.toISOString();
    const { meta } = await this.db
      .prepare(
        "INSERT INTO posts (title, slug, tags, summary, body, published_at, draft_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .bind(draft.title, draft.slug, JSON.stringify(draft.tags), draft.summary, draft.body, draft.publishedAt, draftHash, at, at)
      .run();
    return meta.last_row_id;
  }

  async get(id: PostId): Promise<Post | null> {
    const row = await this.db.prepare(`SELECT ${COLUMNS} FROM posts WHERE id = ?`).bind(id).first<PostRow>();
    return row ? toPost(row) : null;
  }

  // 只写工作稿列（不变量 1：自动保存永远不改快照）
  async updateDraft(id: PostId, content: PostContent, draftHash: string, now: Date): Promise<boolean> {
    const { meta } = await this.db
      .prepare(
        "UPDATE posts SET title = ?, slug = ?, tags = ?, summary = ?, body = ?, published_at = ?, draft_hash = ?, updated_at = ? WHERE id = ?",
      )
      .bind(content.title, content.slug, JSON.stringify(content.tags), content.summary, content.body, content.publishedAt, draftHash, now.toISOString(), id)
      .run();
    return meta.changes > 0;
  }

  // content 为 null 时清空快照（撤回）
  async setPublished(id: PostId, content: PostContent | null, pubHash: string | null, at: Date | null): Promise<boolean> {
    const { meta } = await this.db
      .prepare(
        "UPDATE posts SET pub_title = ?, pub_slug = ?, pub_tags = ?, pub_summary = ?, pub_body = ?, pub_published_at = ?, pub_hash = ?, last_published_at = ? WHERE id = ?",
      )
      .bind(
        content?.title ?? null,
        content?.slug ?? null,
        content ? JSON.stringify(content.tags) : null,
        content?.summary ?? null,
        content?.body ?? null,
        content?.publishedAt ?? null,
        pubHash,
        at?.toISOString() ?? null,
        id,
      )
      .run();
    return meta.changes > 0;
  }

  // slug 全站唯一（不变量 3）：他人的工作稿或已发布快照占用即为冲突；空 slug 不参与
  async slugTaken(slug: string, exceptId: PostId = 0): Promise<boolean> {
    if (slug === "") return false;
    const row = await this.db
      .prepare("SELECT 1 AS hit FROM posts WHERE id <> ? AND (slug = ? OR pub_slug = ?) LIMIT 1")
      .bind(exceptId, slug, slug)
      .first<{ hit: number }>();
    return row !== null;
  }
}
