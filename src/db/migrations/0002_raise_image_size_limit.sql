-- 图片上限 5 MiB → 50 MiB（specs/backlog/raise-image-size-limit.md，media data-model）
-- SQLite 不能修改 CHECK 约束：建新表 → 复制数据 → 删旧表 → 改名 → 重建索引与触发器

CREATE TABLE images_new (
  key            TEXT    NOT NULL PRIMARY KEY,           -- img/2026/10/k3j9x2m4q1_4032x3024_8a7b6c.jpg
  mime           TEXT    NOT NULL CHECK (mime IN ('image/png','image/jpeg','image/webp','image/gif')),
  size           INTEGER NOT NULL CHECK (size BETWEEN 1 AND 52428800),
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

INSERT INTO images_new (key, mime, size, width, height, rgb, video_key, video_size, original_name, created_at, db_create_time, db_update_time)
SELECT key, mime, size, width, height, rgb, video_key, video_size, original_name, created_at, db_create_time, db_update_time FROM images;

DROP TABLE images;

ALTER TABLE images_new RENAME TO images;

CREATE INDEX idx_images_created_at ON images (created_at DESC);

CREATE TRIGGER trg_images_db_update_time AFTER UPDATE ON images
BEGIN
  UPDATE images SET db_update_time = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE key = NEW.key;
END;
