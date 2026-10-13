// PublishedPostQuery（post domain-model §4，F-002 只读接口）：只读已发布快照（pub_* 列），永远读不到工作稿（不变量 4）

export interface PublishedPostSummary {
  slug: string;
  title: string;
  summary: string;
  tags: string[];
  publishedAt: string;
  lastPublishedAt: string;
}

export interface PublishedPost extends PublishedPostSummary {
  body: string; // Markdown 原文，由读者页构建时渲染
}

export interface PublishedPostQuery {
  listPublished(q: { page: number; pageSize: number; tag?: string }): Promise<{ items: PublishedPostSummary[]; total: number }>;
  getPublishedBySlug(slug: string): Promise<PublishedPost | null>;
  listPublishedTags(): Promise<{ name: string; count: number }[]>;
}

interface SnapshotRow {
  pub_slug: string;
  pub_title: string;
  pub_summary: string;
  pub_tags: string;
  pub_published_at: string;
  last_published_at: string;
  pub_body?: string;
}

const SUMMARY_COLUMNS = "pub_slug, pub_title, pub_summary, pub_tags, pub_published_at, last_published_at";
// 标签过滤不区分大小写；未传 tag 时 ?1 为 ''
const LIST_FILTER =
  "pub_hash IS NOT NULL AND (?1 = '' OR EXISTS (SELECT 1 FROM json_each(posts.pub_tags) WHERE lower(value) = lower(?1)))";

function toSummary(row: SnapshotRow): PublishedPostSummary {
  return {
    slug: row.pub_slug,
    title: row.pub_title,
    summary: row.pub_summary,
    tags: JSON.parse(row.pub_tags) as string[],
    publishedAt: row.pub_published_at,
    lastPublishedAt: row.last_published_at,
  };
}

export class D1PublishedPostQuery implements PublishedPostQuery {
  constructor(private readonly db: D1Database) {}

  async listPublished({ page, pageSize, tag = "" }: { page: number; pageSize: number; tag?: string }) {
    const [list, total] = await this.db.batch([
      this.db
        .prepare(
          `SELECT ${SUMMARY_COLUMNS} FROM posts WHERE ${LIST_FILTER} ORDER BY pub_published_at DESC, last_published_at DESC LIMIT ?2 OFFSET ?3`,
        )
        .bind(tag, pageSize, (page - 1) * pageSize),
      this.db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE ${LIST_FILTER}`).bind(tag),
    ]);
    return { items: (list.results as SnapshotRow[]).map(toSummary), total: (total.results[0] as { n: number }).n };
  }

  async getPublishedBySlug(slug: string): Promise<PublishedPost | null> {
    const row = await this.db
      .prepare(`SELECT ${SUMMARY_COLUMNS}, pub_body FROM posts WHERE pub_slug = ? AND pub_hash IS NOT NULL`)
      .bind(slug)
      .first<SnapshotRow>();
    return row ? { ...toSummary(row), body: row.pub_body ?? "" } : null;
  }

  // 读者端标签云：只统计快照，大小写合并，显示出现最多的写法
  async listPublishedTags(): Promise<{ name: string; count: number }[]> {
    const { results } = await this.db
      .prepare(
        `WITH pairs AS (SELECT p.id, j.value AS v FROM posts p, json_each(p.pub_tags) j WHERE p.pub_hash IS NOT NULL),
         spellings AS (SELECT lower(v) AS k, v, COUNT(*) AS uses FROM pairs GROUP BY v),
         groups AS (SELECT lower(v) AS k, COUNT(DISTINCT id) AS count FROM pairs GROUP BY lower(v))
         SELECT (SELECT v FROM spellings s WHERE s.k = g.k ORDER BY uses DESC, v ASC LIMIT 1) AS name, g.count
         FROM groups g ORDER BY g.count DESC, g.k ASC`,
      )
      .all<{ name: string; count: number }>();
    return results;
  }
}
