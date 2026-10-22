-- F-005 书影音：shelf 领域条目表（shelf data-model）
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
