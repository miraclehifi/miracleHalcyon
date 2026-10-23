# shelf 数据模型

**最后更新**: 2026-10-23
**状态**: self-checked
**迁移**: `src/db/migrations/0004_shelf_entries.sql`（已实现，Sprint 9 任务 2；线上待执行，见 ddl-changes）；`0005_shelf_game_platform_cover.sql`（待实现，[ADR-013](../../../features/F-005-书影音/architecture/adr/ADR-013-game-cover-igdb-link.md)）
**存储**: Cloudflare D1（SQLite）+ R2（绑定 `MEDIA`，前缀 `covers/`）

> 审计列的 SQLite 写法说明见 [auth/data-model.md](../auth/data-model.md) 开头。

---

## shelf_entries（D1）

```sql
CREATE TABLE shelf_entries (
  id             INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,   -- 条目 ID（JSON 中为字符串）
  type           TEXT    NOT NULL CHECK (type IN ('book','comic','movie','series','game','boardgame')), -- 分类
  title          TEXT    NOT NULL CHECK (length(title) BETWEEN 1 AND 200),                                     -- 标题
  creator        TEXT    CHECK (creator IS NULL OR length(creator) BETWEEN 1 AND 200),                          -- 作者 / 导演 / 开发商
  year           INTEGER CHECK (year IS NULL OR year BETWEEN 1000 AND 9999),                                   -- 年份
  status         TEXT    NOT NULL CHECK (status IN ('completed','in_progress')),                                -- 状态
  rating         INTEGER CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),                                     -- 我的评分
  marked_on      TEXT    NOT NULL CHECK (marked_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),        -- 标记日期 yyyy-MM-dd
  comment        TEXT    CHECK (comment IS NULL OR length(comment) BETWEEN 1 AND 1000),                        -- 短评
  cover_key      TEXT    CHECK (cover_key IS NULL OR cover_key GLOB 'covers/*'),                               -- 封面 R2 key
  douban_id      TEXT    CHECK (douban_id IS NULL OR (length(douban_id) BETWEEN 1 AND 12 AND douban_id NOT GLOB '*[^0-9]*')), -- 豆瓣条目 ID
  douban_url     TEXT,                                                                                          -- 豆瓣规范条目链接
  hidden         INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),                                           -- 是否隐藏
  created_at     TEXT    NOT NULL,                                                                              -- 业务创建时间 ISO 8601 UTC
  updated_at     TEXT    NOT NULL,                                                                              -- 业务更新时间 ISO 8601 UTC
  db_create_time TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')), -- 数据创建时间（数据库专用，禁止用于业务）
  db_update_time TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')), -- 数据修改时间（数据库专用，禁止用于业务）
  CHECK ((douban_id IS NULL) = (douban_url IS NULL))
) STRICT;

CREATE UNIQUE INDEX uk_shelf_entries_douban_id ON shelf_entries (douban_id) WHERE douban_id IS NOT NULL;
CREATE INDEX idx_shelf_entries_type ON shelf_entries (type, hidden);

CREATE TRIGGER trg_shelf_entries_db_update_time AFTER UPDATE ON shelf_entries
BEGIN
  UPDATE shelf_entries SET db_update_time = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = NEW.id;
END;
```

`length()` 在 SQLite 中按字符计数，与领域"码点"口径一致（BMP 外字符如 emoji 计 1）。日期合法性（如 2 月 29 日）由领域校验，CHECK 只兜底格式。

### 迁移 0005：游戏平台与 IGDB 封面（待实现）

```sql
ALTER TABLE shelf_entries ADD COLUMN platform TEXT
  CHECK (platform IS NULL OR platform IN ('ps5','ps4','switch','switch2','steam'));                       -- 游戏平台
ALTER TABLE shelf_entries ADD COLUMN cover_url TEXT
  CHECK (cover_url IS NULL OR (cover_url GLOB 'https://images.igdb.com/igdb/image/upload/t_1080p/*.jpg'
                               AND length(cover_url) <= 120));                                              -- 游戏封面 IGDB 大图地址
ALTER TABLE shelf_entries ADD COLUMN cover_width INTEGER
  CHECK (cover_width IS NULL OR cover_width BETWEEN 1 AND 20000);                                           -- 封面宽（px）
ALTER TABLE shelf_entries ADD COLUMN cover_height INTEGER
  CHECK (cover_height IS NULL OR cover_height BETWEEN 1 AND 20000);                                         -- 封面高（px）

UPDATE shelf_entries SET platform = 'ps5', cover_key = NULL WHERE type = 'game';
```

- SQLite `ALTER TABLE ADD COLUMN` 只能加单列 CHECK，跨列约束（游戏 ⇔ 有平台、`cover_url` 只属于游戏、`cover_url` 与宽高同空同非空、游戏无 `cover_key`）由领域 `normalizeEntryInput` 与服务保证（domain-model 不变量 6–8）；如需库级兜底，改为重建表（与 0002 同法），本次不做
- `UPDATE` 给已有游戏补平台；游戏原 R2 封面 key 置空——线上 0004 尚未执行无数据，本地开发数据的孤儿对象可忽略
- 只加可空列，旧行其他字段不变；必须先于代码部署

### 查询

| 用途 | 语句 |
|------|------|
| `listByType` | `SELECT * FROM shelf_entries WHERE type = ?1`（排序在领域 `sortEntries`，避免 SQL 与前端两套规则） |
| `listVisible` | `SELECT type, title, creator, year, status, rating, marked_on, comment, cover_key, douban_url, platform, cover_url, cover_width, cover_height FROM shelf_entries WHERE hidden = 0 ORDER BY id DESC` |
| `counts` | 由 `listByType` 结果在领域内计算 |
| `findByDoubanId` | `SELECT id, title, type, status, marked_on FROM shelf_entries WHERE douban_id = ?1` |
| `insert` | `INSERT … RETURNING *`；`SQLITE_CONSTRAINT_UNIQUE`（消息含 `uk_shelf_entries_douban_id` / `shelf_entries.douban_id`）→ `DuplicateDoubanError` |
| `update` | `UPDATE shelf_entries SET …, updated_at = ?n WHERE id = ?1 RETURNING *` |
| `setHidden` | `UPDATE shelf_entries SET hidden = ?2, updated_at = ?3 WHERE id = ?1 AND hidden <> ?2 RETURNING *`；无返回时再 `SELECT` 区分"无变化"与"不存在" |
| `delete` | `DELETE FROM shelf_entries WHERE id = ?1 RETURNING *` |

## R2 对象（绑定 `MEDIA`）

| 对象 | key | httpMetadata |
|------|-----|-------------|
| 封面 | `covers/{yyyy}/{mm}/{12 位 base32}.{jpg|png|webp}` | `contentType` = 文件头判定的 mime；`cacheControl` = `public, max-age=31536000, immutable` |

- 不写 `images` 表；F-006 存储清理只处理 `images` 登记的 key，不会触及 `covers/`（见 media domain-model 不变量补充）
- 测试环境使用独立 bucket（沿用 media）

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-21 | 1.0 | 初始版本（F-005） | miraclehifi |
| 2026-10-22 | 1.1 | 去掉'动画'分类、'剧'改名'剧集'（[drop-anime-type](../../../../backlog/drop-anime-type.md)） | miraclehifi |
| 2026-10-23 | 1.2 | 迁移 0005：`platform`、`cover_url`、`cover_width`、`cover_height`（[game-case-shelf](../../../../backlog/game-case-shelf.md)） | miraclehifi |
