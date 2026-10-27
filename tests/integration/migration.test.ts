import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

// create-d1-init-migration：auth / post / media 三个 data-model 的全部 DDL；0004 起含 shelf（F-005）
const EXPECTED_SCHEMA = [
  "index:idx_images_created_at",
  "index:idx_posts_pub_list",
  "index:idx_posts_updated",
  "index:idx_sessions_expires_at",
  "index:idx_shelf_entries_type",
  "index:uk_shelf_entries_douban_id",
  "index:uq_posts_pub_slug",
  "index:uq_posts_slug",
  "table:images",
  "table:login_attempts",
  "table:posts",
  "table:sessions",
  "table:shelf_entries",
  "trigger:trg_images_db_update_time",
  "trigger:trg_login_attempts_db_update_time",
  "trigger:trg_posts_db_update_time",
  "trigger:trg_sessions_db_update_time",
  "trigger:trg_shelf_entries_db_update_time",
];
const STALE_TIME = "2000-01-01 00:00:00.000";
const NOW = "2026-10-13T00:00:00.000Z";

describe("D1 初始迁移", () => {
  it("建出四张表及全部索引、触发器，UPDATE 后 db_update_time 刷新", async () => {
    const { results } = await env.DB.prepare(
      "SELECT type || ':' || name AS item FROM sqlite_master WHERE type IN ('table','index','trigger') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%' ORDER BY item",
    ).all<{ item: string }>();

    const { meta } = await env.DB.prepare(
      "INSERT INTO posts (draft_hash, created_at, updated_at, db_update_time) VALUES ('h0', ?1, ?1, ?2)",
    ).bind(NOW, STALE_TIME).run();
    await env.DB.prepare("UPDATE posts SET title = '改过' WHERE id = ?").bind(meta.last_row_id).run();
    const row = await env.DB.prepare("SELECT db_update_time FROM posts WHERE id = ?").bind(meta.last_row_id).first<{ db_update_time: string }>();

    expect({ schema: results.map((r) => r.item), touched: row?.db_update_time !== STALE_TIME }).toEqual({
      schema: EXPECTED_SCHEMA,
      touched: true,
    });
  });

  // 迁移 0005（shelf data-model，ADR-013）：新增四列；已有游戏补 ps5、去掉 R2 封面；CHECK 拒绝非法平台与非规范地址
  it("0005：游戏平台与 IGDB 封面列", async () => {
    const { results: columns } = await env.DB.prepare("SELECT name FROM pragma_table_info('shelf_entries') WHERE name IN ('platform','cover_url','cover_width','cover_height') ORDER BY cid").all<{ name: string }>();
    const insert = (type: string, extra = "", values = "") =>
      env.DB.prepare(`INSERT INTO shelf_entries (type, title, status, marked_on, cover_key, created_at, updated_at${extra}) VALUES (?1, 'x', 'completed', '2026-10-01', 'covers/2026/10/aaaaaaaaaaaa.jpg', ?2, ?2${values}) RETURNING id`)
        .bind(type, NOW);
    const game = (await insert("game").first<{ id: number }>())!.id;
    const book = (await insert("book").first<{ id: number }>())!.id;
    const migration = env.TEST_MIGRATIONS.find((m) => m.name.startsWith("0005_"))!;
    const backfill = migration.queries.filter((q) => /^\s*UPDATE/im.test(q));
    for (const q of backfill) await env.DB.prepare(q).run();
    const rows = await env.DB.prepare("SELECT id, platform, cover_key FROM shelf_entries WHERE id IN (?1, ?2) ORDER BY id").bind(game, book).all<{ id: number; platform: string | null; cover_key: string | null }>();
    const rejects = async (extra: string, values: string) => insert("game", extra, values).run().then(() => "ok", (e: Error) => (/CHECK constraint failed/.test(e.message) ? "CHECK" : e.message));
    expect({
      columns: columns.map((c) => c.name),
      backfill: backfill.length,
      rows: rows.results.map((r) => [r.platform, r.cover_key]),
      bad: [
        await rejects(", platform", ", 'xbox'"),
        await rejects(", cover_url", ", 'https://example.com/a.jpg'"),
        await rejects(", cover_url", ", 'https://images.igdb.com/igdb/image/upload/t_720p/co8h3y.png'"),
        await rejects(", cover_width", ", 0"),
      ],
      ok: await rejects(", platform, cover_url, cover_width, cover_height", ", 'switch2', 'https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg', 810, 1080"),
    }).toEqual({
      columns: ["platform", "cover_url", "cover_width", "cover_height"],
      backfill: 1,
      rows: [["ps5", null], [null, "covers/2026/10/aaaaaaaaaaaa.jpg"]],
      bad: ["CHECK", "CHECK", "CHECK", "CHECK"],
      ok: "ok",
    });
  });
});
