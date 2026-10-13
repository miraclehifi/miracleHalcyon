-- 0001_init：F-001 初始表结构，DDL 与各 data-model.md 保持一致（改表请新增迁移，不改本文件）

-- ── auth（specs/engineering/backend/domains/auth/data-model.md）──────────

CREATE TABLE sessions (
  token_hash     TEXT    NOT NULL PRIMARY KEY,                -- sha256(token) 小写 hex
  created_at     TEXT    NOT NULL,                            -- ISO 8601 UTC（业务时间）
  expires_at     TEXT    NOT NULL,                            -- ISO 8601 UTC
  db_create_time TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')), -- 数据创建时间（数据库专用，禁止用于业务）
  db_update_time TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))  -- 数据修改时间（数据库专用，禁止用于业务）
) STRICT;

CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

CREATE TRIGGER trg_sessions_db_update_time AFTER UPDATE ON sessions
BEGIN
  UPDATE sessions SET db_update_time = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE token_hash = NEW.token_hash;
END;

CREATE TABLE login_attempts (
  ip             TEXT    NOT NULL PRIMARY KEY,
  fail_count     INTEGER NOT NULL DEFAULT 0 CHECK (fail_count BETWEEN 0 AND 5),
  locked_until   TEXT,                                        -- ISO 8601 UTC；NULL 表示未锁定
  db_create_time TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')), -- 数据创建时间（数据库专用，禁止用于业务）
  db_update_time TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now'))  -- 数据修改时间（数据库专用，禁止用于业务）
) STRICT;

CREATE TRIGGER trg_login_attempts_db_update_time AFTER UPDATE ON login_attempts
BEGIN
  UPDATE login_attempts SET db_update_time = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE ip = NEW.ip;
END;

-- ── post（specs/engineering/backend/domains/post/data-model.md）──────────

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

-- ── media（specs/engineering/backend/domains/media/data-model.md）──────────

CREATE TABLE images (
  key            TEXT    NOT NULL PRIMARY KEY,           -- img/2026/10/k3j9x2m4q1_4032x3024_8a7b6c.jpg
  mime           TEXT    NOT NULL CHECK (mime IN ('image/png','image/jpeg','image/webp','image/gif')),
  size           INTEGER NOT NULL CHECK (size BETWEEN 1 AND 5242880),
  width          INTEGER NOT NULL CHECK (width BETWEEN 1 AND 20000),
  height         INTEGER NOT NULL CHECK (height BETWEEN 1 AND 20000),
  rgb            TEXT    NOT NULL CHECK (length(rgb) = 6),
  video_key      TEXT,                                   -- 实况视频 key；NULL = 普通图片
  video_size     INTEGER CHECK (video_size IS NULL OR video_size BETWEEN 1 AND 10485760),
  original_name  TEXT    NOT NULL DEFAULT '',
  created_at     TEXT    NOT NULL,                       -- ISO 8601 UTC
  db_create_time TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')), -- 数据创建时间（数据库专用，禁止用于业务）
  db_update_time TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')), -- 数据修改时间（数据库专用，禁止用于业务）
  CHECK ((video_key IS NULL) = (video_size IS NULL))
) STRICT;

CREATE INDEX idx_images_created_at ON images (created_at DESC);

CREATE TRIGGER trg_images_db_update_time AFTER UPDATE ON images
BEGIN
  UPDATE images SET db_update_time = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE key = NEW.key;
END;
