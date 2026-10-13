import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

// create-d1-init-migration：auth / post / media 三个 data-model 的全部 DDL
const EXPECTED_SCHEMA = [
  "index:idx_images_created_at",
  "index:idx_posts_pub_list",
  "index:idx_posts_updated",
  "index:idx_sessions_expires_at",
  "index:uq_posts_pub_slug",
  "index:uq_posts_slug",
  "table:images",
  "table:login_attempts",
  "table:posts",
  "table:sessions",
  "trigger:trg_images_db_update_time",
  "trigger:trg_login_attempts_db_update_time",
  "trigger:trg_posts_db_update_time",
  "trigger:trg_sessions_db_update_time",
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
});
