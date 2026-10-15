# post 数据模型

**最后更新**: 2026-10-15
**状态**: self-checked
**存储**: Cloudflare D1（SQLite）

> 审计列的 SQLite 写法说明见 [auth/data-model.md](../auth/data-model.md) 开头。

---

## posts

```sql
CREATE TABLE posts (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  -- 工作稿（自动保存只写这些列）
  title              TEXT    NOT NULL DEFAULT '无标题',
  slug               TEXT    NOT NULL DEFAULT '',          -- '' = 未填写
  tags               TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),  -- JSON 字符串数组
  summary            TEXT    NOT NULL DEFAULT '',
  body               TEXT    NOT NULL DEFAULT '',
  published_at       TEXT,                                 -- 发布日期 yyyy-MM-dd
  draft_hash         TEXT    NOT NULL,                     -- contentHash(工作稿)
  -- 已发布快照（pub_hash IS NULL = 草稿）
  pub_title          TEXT,
  pub_slug           TEXT,
  pub_tags           TEXT    CHECK (pub_tags IS NULL OR json_valid(pub_tags)),
  pub_summary        TEXT,
  pub_body           TEXT,
  pub_published_at   TEXT,
  pub_hash           TEXT,
  last_published_at  TEXT,                                 -- ISO 8601 UTC
  -- 业务时间
  created_at         TEXT    NOT NULL,                     -- ISO 8601 UTC
  updated_at         TEXT    NOT NULL,                     -- ISO 8601 UTC，工作稿保存时间
  -- 审计
  db_create_time     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')), -- 数据创建时间（数据库专用，禁止用于业务）
  db_update_time     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')), -- 数据修改时间（数据库专用，禁止用于业务）
  CHECK ((pub_hash IS NULL) = (pub_slug IS NULL)),
  CHECK (pub_hash IS NULL OR (pub_slug <> '' AND pub_title IS NOT NULL AND pub_body IS NOT NULL))
) STRICT;

CREATE UNIQUE INDEX uq_posts_slug     ON posts (slug)     WHERE slug <> '';
CREATE UNIQUE INDEX uq_posts_pub_slug ON posts (pub_slug) WHERE pub_slug IS NOT NULL;
CREATE INDEX idx_posts_updated        ON posts (updated_at DESC, id DESC);
CREATE INDEX idx_posts_pub_list       ON posts (pub_published_at DESC, last_published_at DESC) WHERE pub_hash IS NOT NULL;

CREATE TRIGGER trg_posts_db_update_time AFTER UPDATE ON posts
BEGIN
  UPDATE posts SET db_update_time = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = NEW.id;
END;
```

**说明**
- 两个部分唯一索引兜底"同一列内唯一"；"A 的工作稿 slug = B 的快照 slug"这种跨列冲突由服务层 `slugTaken` 检查（不变量 3），写入与检查在同一个 `batch` 中
- 派生字段：`status = CASE WHEN pub_hash IS NULL THEN 'draft' ELSE 'published' END`；`has_unpublished_changes = pub_hash IS NOT NULL AND pub_hash <> draft_hash`
- 标签以 JSON 数组存储；标签查询用 `json_each`（千篇以内，见 US-07 假设），不建标签表

## posts 增量：封面（迁移 0003，F-002 US-06）

```sql
-- src/db/migrations/0003_post_cover.sql
ALTER TABLE posts ADD COLUMN cover     TEXT;  -- 工作稿封面：站内图片地址，NULL = 无封面
ALTER TABLE posts ADD COLUMN pub_cover TEXT;  -- 已发布快照封面
```

- 只加可空列，不改约束与索引；已有行两列均为 NULL，`draft_hash` / `pub_hash` 不需要重算（`contentHash` 兼容规则，见 domain-model §2.2）
- `STRICT` 表 `ADD COLUMN` 允许 `TEXT` 可空列；不需要重建表
- 公开查询（详情、列表）补选 `pub_cover AS cover`；`setPublished` 同时写 `pub_cover`，撤回时清空

## 查询路径

| 操作 | SQL 要点 | 索引 |
|------|---------|------|
| 后台列表 | `WHERE (? = '' OR title LIKE …) AND (状态条件) ORDER BY updated_at DESC, id DESC LIMIT 20 OFFSET ?` | `idx_posts_updated` |
| 计数 | `SELECT COUNT(*), SUM(pub_hash IS NULL), SUM(pub_hash IS NOT NULL) … WHERE (q 条件)` | 全表扫描（千篇以内可接受） |
| slug 冲突 | `WHERE id <> ? AND (slug = ? OR pub_slug = ?)` | 两个唯一索引 |
| 公开详情 | `WHERE pub_slug = ?` | `uq_posts_pub_slug` |
| 公开列表 | `WHERE pub_hash IS NOT NULL [AND EXISTS (SELECT 1 FROM json_each(pub_tags) WHERE lower(value) = lower(?))] ORDER BY pub_published_at DESC, last_published_at DESC` | `idx_posts_pub_list` |
| 标签补全 | `SELECT value, COUNT(*) FROM posts, json_each(tags) … UNION 快照标签 … GROUP BY lower(value)` | — |

## 迁移

`src/db/migrations/0001_init.sql`（已实现）：本文件与 auth、media 的全部建表语句；`0002_raise_image_size_limit.sql`（已实现，media）；`0003_post_cover.sql`（F-002，已实现；线上执行见 [ddl-changes](../../../../deploy/ddl-changes.md)）。本地执行 `npm run db:migrate:local`。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-15 | 1.1 | 迁移 0003：`cover`、`pub_cover`（F-002 US-06） | miraclehifi |
