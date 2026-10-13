# media 数据模型

**最后更新**: 2026-10-13
**状态**: self-checked
**迁移**: `src/db/migrations/0001_init.sql`（已实现）
**存储**: Cloudflare D1（SQLite）+ R2

> 审计列的 SQLite 写法说明见 [auth/data-model.md](../auth/data-model.md) 开头。

---

## images（D1）

```sql
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
```

`images` 只做记录（审计、将来的图片库）；渲染不依赖它（ADR-005）。

## R2 对象（绑定 `MEDIA`）

| 对象 | key | httpMetadata |
|------|-----|-------------|
| 图片 | `img/{yyyy}/{mm}/{id}_{w}x{h}_{rgb}.{ext}` | `contentType` = 判定的 mime；`cacheControl` = `public, max-age=31536000, immutable` |
| 实况视频 | 同名 + `.live.mp4` | `contentType: video/mp4`；同上 |

不设置 `customMetadata`（文件名信息在 `images.original_name`）。测试环境使用独立 bucket。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
