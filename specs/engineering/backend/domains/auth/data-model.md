# auth 数据模型

**最后更新**: 2026-10-13
**状态**: self-checked
**迁移**: `src/db/migrations/0001_init.sql`（已实现）
**存储**: Cloudflare D1（SQLite）

> 审计列：DDL 规则原文是 MySQL 写法（`DATETIME(3)` + `ON UPDATE`）。SQLite 没有 `ON UPDATE`，等价实现为 `TEXT` 默认值 + `AFTER UPDATE` 触发器；值为 UTC，格式 `yyyy-MM-dd HH:mm:ss.SSS`，仅供数据库运维使用，禁止用于业务。

---

## sessions

```sql
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
```

## login_attempts

```sql
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
```

> 触发器内的 `UPDATE` 不会递归触发（SQLite 默认 `recursive_triggers = OFF`）。

## 查询路径

| 操作 | SQL 要点 | 索引 |
|------|---------|------|
| 校验会话 | `SELECT … WHERE token_hash = ? AND expires_at > ?` | 主键 |
| 删除过期会话 | 校验时命中过期记录即删除；另在登录成功时顺带 `DELETE … WHERE expires_at <= ?` | `idx_sessions_expires_at` |
| 限流读写 | 按 `ip` 主键 `INSERT … ON CONFLICT(ip) DO UPDATE` | 主键 |

ISO 8601 UTC 字符串可直接按字典序比较，等价于时间比较。

## 数据保留

- 过期会话：登录成功时批量清理
- `login_attempts`：成功登录即删除；锁定过期的记录在下次访问时覆盖，不单独清理（单作者站点量极小）

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
