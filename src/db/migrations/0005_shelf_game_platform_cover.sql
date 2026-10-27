-- F-005 书影音：游戏平台与 IGDB 封面（shelf data-model"迁移 0005"，ADR-013）
-- 跨列约束（游戏 ⇔ 有平台、cover_url 只属于游戏、cover_url 与宽高同空同非空、游戏无 cover_key）由领域保证
-- D1 限制 GLOB / LIKE 模式不超过 50 字符，cover_url 用 instr 判前缀、substr 判后缀
ALTER TABLE shelf_entries ADD COLUMN platform TEXT
  CHECK (platform IS NULL OR platform IN ('ps5','ps4','switch','switch2','steam'));                       -- 游戏平台
ALTER TABLE shelf_entries ADD COLUMN cover_url TEXT
  CHECK (cover_url IS NULL OR (instr(cover_url, 'https://images.igdb.com/igdb/image/upload/t_1080p/') = 1
                               AND substr(cover_url, -4) = '.jpg' AND length(cover_url) BETWEEN 55 AND 120)); -- 游戏封面 IGDB 大图地址
ALTER TABLE shelf_entries ADD COLUMN cover_width INTEGER
  CHECK (cover_width IS NULL OR cover_width BETWEEN 1 AND 20000);                                           -- 封面宽（px）
ALTER TABLE shelf_entries ADD COLUMN cover_height INTEGER
  CHECK (cover_height IS NULL OR cover_height BETWEEN 1 AND 20000);                                         -- 封面高（px）

UPDATE shelf_entries SET platform = 'ps5', cover_key = NULL WHERE type = 'game';
