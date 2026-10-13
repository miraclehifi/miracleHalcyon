// PostRepo（post domain-model §5，data-model posts 表）；delete 由后续任务补充
import type { PostContent } from "./content";
import type { Post, PostId } from "./post";

export interface NewPostRow {
  draft: PostContent;
  draftHash: string;
  createdAt: Date; // 同时作为首次 updatedAt
}

export type ListStatus = "all" | "draft" | "published";

export interface ListQuery {
  status: ListStatus;
  q: string; // 已去首尾空白；空串 = 不过滤
  page: number;
  pageSize: number;
}

// 列表只取需要的列，不读正文
export interface PostSummary {
  id: PostId;
  title: string;
  tags: string[];
  draftHash: string;
  pubHash: string | null;
  updatedAt: Date;
}

export interface StatusCounts {
  all: number;
  draft: number;
  published: number;
}

export interface TagSuggestion {
  name: string;
  count: number;
}

export interface PostRepo {
  insert(row: NewPostRow): Promise<PostId>;
  get(id: PostId): Promise<Post | null>;
  updateDraft(id: PostId, content: PostContent, draftHash: string, now: Date): Promise<boolean>; // false = 不存在
  setPublished(id: PostId, content: PostContent | null, pubHash: string | null, at: Date | null): Promise<boolean>;
  slugTaken(slug: string, exceptId?: PostId): Promise<boolean>;
  list(query: ListQuery): Promise<{ rows: PostSummary[]; total: number; counts: StatusCounts }>;
  tags(q: string, limit: number): Promise<TagSuggestion[]>;
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

// 标题包含匹配（ASCII 不区分大小写）。用 instr 而不是 LIKE：D1 限制 LIKE 模式 ≤ 50 字节，
// 100 字的搜索词（中文每字 3 字节）会报 "pattern too complex"；instr 也不需要转义 % _ \
const TITLE_FILTER = "(?1 = '' OR instr(lower(title), lower(?1)) > 0)";
const STATUS_FILTER: Record<ListStatus, string> = {
  all: "1 = 1",
  draft: "pub_hash IS NULL",
  published: "pub_hash IS NOT NULL", // 含有未发布修改的
};

// 工作稿与快照标签合并为 (文章, 标签) 对（UNION 去重：同一篇的两份内容只算一次）；按小写分组计文章数，
// 显示写法取出现次数最多的那种
const TAGS_SQL = `
WITH pairs AS (
  SELECT p.id, j.value AS v FROM posts p, json_each(p.tags) j
  UNION
  SELECT p.id, j.value FROM posts p, json_each(p.pub_tags) j WHERE p.pub_tags IS NOT NULL
),
matched AS (SELECT id, v FROM pairs WHERE ?1 = '' OR instr(lower(v), lower(?1)) > 0),
spellings AS (SELECT lower(v) AS k, v, COUNT(*) AS uses FROM matched GROUP BY v),
groups AS (SELECT lower(v) AS k, COUNT(DISTINCT id) AS count FROM matched GROUP BY lower(v))
SELECT (SELECT v FROM spellings s WHERE s.k = g.k ORDER BY uses DESC, v ASC LIMIT 1) AS name, g.count
FROM groups g ORDER BY g.count DESC, g.k ASC LIMIT ?2`;

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

  async list({ status, q, page, pageSize }: ListQuery): Promise<{ rows: PostSummary[]; total: number; counts: StatusCounts }> {
    const [list, totals, counts] = await this.db.batch([
      this.db
        .prepare(
          `SELECT id, title, tags, draft_hash, pub_hash, updated_at FROM posts WHERE ${TITLE_FILTER} AND ${STATUS_FILTER[status]} ` +
            "ORDER BY updated_at DESC, id DESC LIMIT ?2 OFFSET ?3",
        )
        .bind(q, pageSize, (page - 1) * pageSize),
      this.db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE ${TITLE_FILTER} AND ${STATUS_FILTER[status]}`).bind(q),
      // 分段控件的数量：只应用 q，不应用 status
      this.db
        .prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(pub_hash IS NULL), 0) AS draft, COALESCE(SUM(pub_hash IS NOT NULL), 0) AS published FROM posts WHERE ${TITLE_FILTER}`)
        .bind(q),
    ]);
    const rows = (list.results as Pick<PostRow, "id" | "title" | "tags" | "draft_hash" | "pub_hash" | "updated_at">[]).map((row) => ({
      id: row.id,
      title: row.title,
      tags: JSON.parse(row.tags) as string[],
      draftHash: row.draft_hash,
      pubHash: row.pub_hash,
      updatedAt: new Date(row.updated_at),
    }));
    const count = counts.results[0] as { total: number; draft: number; published: number };
    return {
      rows,
      total: (totals.results[0] as { n: number }).n,
      counts: { all: count.total, draft: count.draft, published: count.published },
    };
  }

  async tags(q: string, limit: number): Promise<TagSuggestion[]> {
    const { results } = await this.db.prepare(TAGS_SQL).bind(q, limit).all<TagSuggestion>();
    return results;
  }
}
