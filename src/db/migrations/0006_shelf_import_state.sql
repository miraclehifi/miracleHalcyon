-- F-005 书影音：豆瓣导入同步水位（shelf data-model"shelf_import_state"，ADR-014 §1.1）
-- D1 限制 GLOB / LIKE 模式不超过 50 字符，watermark 按日期、时间两段校验
CREATE TABLE shelf_import_state (
  uid            TEXT NOT NULL CHECK (length(uid) BETWEEN 1 AND 64 AND uid NOT GLOB '*[^A-Za-z0-9_.-]*'), -- 豆瓣用户 ID
  type           TEXT NOT NULL CHECK (type IN ('book','comic','movie','series','game','boardgame')),      -- 本站分类（导入按类别记水位）
  status         TEXT NOT NULL CHECK (status IN ('done','doing')),                                        -- 豆瓣标记状态
  watermark      TEXT CHECK (watermark IS NULL OR (length(watermark) = 19
                   AND substr(watermark, 1, 10) GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
                   AND substr(watermark, 11) GLOB ' [0-9][0-9]:[0-9][0-9]:[0-9][0-9]')),                  -- 已完整同步到的最新标记时间（豆瓣 create_time 原文）
  synced_at      TEXT,                                                                                    -- 最近一次完整同步完成时间 ISO 8601 UTC
  attempted_at   TEXT NOT NULL,                                                                           -- 最近一次导入请求时间 ISO 8601 UTC
  db_create_time TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')), -- 数据创建时间（数据库专用，禁止用于业务）
  db_update_time TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%f', 'now')), -- 数据修改时间（数据库专用，禁止用于业务）
  PRIMARY KEY (uid, type, status)
) STRICT;

CREATE INDEX idx_shelf_import_state_attempted ON shelf_import_state (attempted_at);

CREATE TRIGGER trg_shelf_import_state_db_update_time AFTER UPDATE ON shelf_import_state
BEGIN
  UPDATE shelf_import_state SET db_update_time = strftime('%Y-%m-%d %H:%M:%f', 'now')
  WHERE uid = NEW.uid AND type = NEW.type AND status = NEW.status;
END;
