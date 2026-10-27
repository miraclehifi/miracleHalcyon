// shelf 仓储（shelf domain-model §3、data-model）：D1 shelf_entries
import type { EntryData, ShelfPlatform, ShelfStatus, ShelfType } from "./entry";
import { DuplicateDoubanError } from "./errors";

export interface ShelfEntry extends EntryData {
  id: number;
  coverKey: string | null;
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EntryRowInput = EntryData & { coverKey: string | null; now: string };

export interface DoubanMatch {
  id: number;
  title: string;
  type: ShelfType;
  status: ShelfStatus;
  markedOn: string;
}

export interface ShelfRepo {
  listByType(type: ShelfType): Promise<ShelfEntry[]>; // 含隐藏
  listVisible(): Promise<ShelfEntry[]>; // hidden = 0，id 降序
  get(id: number): Promise<ShelfEntry | null>;
  findByDoubanId(doubanId: string): Promise<DoubanMatch | null>;
  findByDoubanIds(doubanIds: string[]): Promise<Map<string, ShelfEntry>>; // US-04：导入一页批量查询（≤ 20 个）
  insert(data: EntryRowInput): Promise<ShelfEntry>; // 豆瓣 ID 冲突 → DuplicateDoubanError
  update(id: number, data: EntryRowInput): Promise<ShelfEntry | null>;
  setHidden(id: number, hidden: boolean, now: Date): Promise<{ entry: ShelfEntry; changed: boolean } | null>;
  delete(id: number): Promise<ShelfEntry | null>;
}

interface Row {
  id: number;
  type: ShelfType;
  title: string;
  creator: string | null;
  year: number | null;
  status: ShelfStatus;
  rating: number | null;
  marked_on: string;
  comment: string | null;
  cover_key: string | null;
  douban_id: string | null;
  douban_url: string | null;
  hidden: number;
  platform: ShelfPlatform | null;
  cover_url: string | null;
  cover_width: number | null;
  cover_height: number | null;
  created_at: string;
  updated_at: string;
}

const COLUMNS = "id, type, title, creator, year, status, rating, marked_on, comment, cover_key, douban_id, douban_url, hidden, platform, cover_url, cover_width, cover_height, created_at, updated_at";

const toEntry = (row: Row): ShelfEntry => ({
  id: row.id,
  type: row.type,
  title: row.title,
  creator: row.creator,
  year: row.year,
  status: row.status,
  rating: row.rating,
  markedOn: row.marked_on,
  comment: row.comment,
  coverKey: row.cover_key,
  douban: row.douban_id && row.douban_url ? { id: row.douban_id, url: row.douban_url } : null,
  hidden: row.hidden === 1,
  platform: row.platform,
  coverUrl: row.cover_url,
  coverWidth: row.cover_width,
  coverHeight: row.cover_height,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const isDoubanConflict = (error: unknown) => /UNIQUE constraint failed: shelf_entries\.douban_id/.test(String((error as Error)?.message ?? error));

const values = (d: EntryRowInput) => [d.type, d.title, d.creator, d.year, d.status, d.rating, d.markedOn, d.comment, d.coverKey, d.douban?.id ?? null, d.douban?.url ?? null, d.platform, d.coverUrl, d.coverWidth, d.coverHeight];

export class D1ShelfRepo implements ShelfRepo {
  constructor(private readonly db: D1Database) {}

  async listByType(type: ShelfType): Promise<ShelfEntry[]> {
    const { results } = await this.db.prepare(`SELECT ${COLUMNS} FROM shelf_entries WHERE type = ?`).bind(type).all<Row>();
    return results.map(toEntry);
  }

  async listVisible(): Promise<ShelfEntry[]> {
    const { results } = await this.db.prepare(`SELECT ${COLUMNS} FROM shelf_entries WHERE hidden = 0 ORDER BY id DESC`).all<Row>();
    return results.map(toEntry);
  }

  async get(id: number): Promise<ShelfEntry | null> {
    const row = await this.db.prepare(`SELECT ${COLUMNS} FROM shelf_entries WHERE id = ?`).bind(id).first<Row>();
    return row ? toEntry(row) : null;
  }

  async findByDoubanId(doubanId: string): Promise<DoubanMatch | null> {
    return this.db
      .prepare("SELECT id, title, type, status, marked_on AS markedOn FROM shelf_entries WHERE douban_id = ?")
      .bind(doubanId)
      .first<DoubanMatch>();
  }

  async findByDoubanIds(doubanIds: string[]): Promise<Map<string, ShelfEntry>> {
    if (doubanIds.length === 0) return new Map();
    const marks = doubanIds.map(() => "?").join(", ");
    const { results } = await this.db.prepare(`SELECT ${COLUMNS} FROM shelf_entries WHERE douban_id IN (${marks})`).bind(...doubanIds).all<Row>();
    return new Map(results.map((row) => [row.douban_id!, toEntry(row)]));
  }

  async insert(data: EntryRowInput): Promise<ShelfEntry> {
    try {
      const row = await this.db
        .prepare(
          `INSERT INTO shelf_entries (type, title, creator, year, status, rating, marked_on, comment, cover_key, douban_id, douban_url, platform, cover_url, cover_width, cover_height, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING ${COLUMNS}`,
        )
        .bind(...values(data), data.now, data.now)
        .first<Row>();
      return toEntry(row!);
    } catch (error) {
      if (isDoubanConflict(error)) throw new DuplicateDoubanError(data.douban ? await this.findByDoubanId(data.douban.id) : null);
      throw error;
    }
  }

  async update(id: number, data: EntryRowInput): Promise<ShelfEntry | null> {
    try {
      const row = await this.db
        .prepare(
          `UPDATE shelf_entries SET type = ?, title = ?, creator = ?, year = ?, status = ?, rating = ?, marked_on = ?, comment = ?, cover_key = ?, douban_id = ?, douban_url = ?, platform = ?, cover_url = ?, cover_width = ?, cover_height = ?, updated_at = ?
           WHERE id = ? RETURNING ${COLUMNS}`,
        )
        .bind(...values(data), data.now, id)
        .first<Row>();
      return row ? toEntry(row) : null;
    } catch (error) {
      if (isDoubanConflict(error)) throw new DuplicateDoubanError(data.douban ? await this.findByDoubanId(data.douban.id) : null);
      throw error;
    }
  }

  async setHidden(id: number, hidden: boolean, now: Date): Promise<{ entry: ShelfEntry; changed: boolean } | null> {
    const flag = hidden ? 1 : 0;
    const row = await this.db
      .prepare(`UPDATE shelf_entries SET hidden = ?, updated_at = ? WHERE id = ? AND hidden <> ? RETURNING ${COLUMNS}`)
      .bind(flag, now.toISOString(), id, flag)
      .first<Row>();
    if (row) return { entry: toEntry(row), changed: true };
    const entry = await this.get(id);
    return entry ? { entry, changed: false } : null;
  }

  async delete(id: number): Promise<ShelfEntry | null> {
    const row = await this.db.prepare(`DELETE FROM shelf_entries WHERE id = ? RETURNING ${COLUMNS}`).bind(id).first<Row>();
    return row ? toEntry(row) : null;
  }
}
