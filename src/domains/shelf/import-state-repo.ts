// 豆瓣导入同步水位（shelf domain-model §3、data-model"shelf_import_state"，ADR-014 §1.1）：按 用户 ID × 本站分类 × 豆瓣状态 记录
import { IMPORT_STATUSES, IMPORT_TYPES, type ImportStatus } from "./douban/import";
import type { ShelfType } from "./entry";

export interface ImportCategoryState {
  type: ShelfType;
  status: ImportStatus;
  watermark: string | null; // 豆瓣 create_time 原文（北京时间）
  syncedAt: string | null; // ISO 8601 UTC
}

export interface ImportStateRepo {
  get(uid: string): Promise<ImportCategoryState[]>; // 按 电影、剧集、书、漫画、游戏、桌游 × done、doing 补齐 12 项
  lastUid(): Promise<string | null>; // attempted_at 最新的 uid
  touch(uid: string, types: ShelfType[], status: ImportStatus, now: string): Promise<void>;
  complete(uid: string, types: ShelfType[], status: ImportStatus, head: string | null, now: string): Promise<void>; // 水位 = COALESCE(head, 原水位)
}

// 12 项固定顺序；rows 中没有的项为空
export function fillCategories(rows: ImportCategoryState[]): ImportCategoryState[] {
  return IMPORT_TYPES.flatMap((type) =>
    IMPORT_STATUSES.map((status) => {
      const row = rows.find((r) => r.type === type && r.status === status);
      return { type, status, watermark: row?.watermark ?? null, syncedAt: row?.syncedAt ?? null };
    }),
  );
}

interface Row {
  type: ShelfType;
  status: ImportStatus;
  watermark: string | null;
  synced_at: string | null;
}

export class D1ImportStateRepo implements ImportStateRepo {
  constructor(private readonly db: D1Database) {}

  async get(uid: string): Promise<ImportCategoryState[]> {
    const { results } = await this.db.prepare("SELECT type, status, watermark, synced_at FROM shelf_import_state WHERE uid = ?").bind(uid).all<Row>();
    return fillCategories(results.map((r) => ({ type: r.type, status: r.status, watermark: r.watermark, syncedAt: r.synced_at })));
  }

  async lastUid(): Promise<string | null> {
    const row = await this.db.prepare("SELECT uid FROM shelf_import_state ORDER BY attempted_at DESC, rowid DESC LIMIT 1").first<{ uid: string }>();
    return row?.uid ?? null;
  }

  async touch(uid: string, types: ShelfType[], status: ImportStatus, now: string): Promise<void> {
    const sql = `INSERT INTO shelf_import_state (uid, type, status, attempted_at) VALUES (?1, ?2, ?3, ?4)
                 ON CONFLICT (uid, type, status) DO UPDATE SET attempted_at = excluded.attempted_at`;
    await this.db.batch(types.map((type) => this.db.prepare(sql).bind(uid, type, status, now)));
  }

  async complete(uid: string, types: ShelfType[], status: ImportStatus, head: string | null, now: string): Promise<void> {
    const sql = "UPDATE shelf_import_state SET watermark = COALESCE(?4, watermark), synced_at = ?5 WHERE uid = ?1 AND type = ?2 AND status = ?3";
    await this.db.batch(types.map((type) => this.db.prepare(sql).bind(uid, type, status, head, now)));
  }
}
