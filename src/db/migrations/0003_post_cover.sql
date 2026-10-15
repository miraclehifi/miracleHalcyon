-- 文章封面（F-002 US-06，post data-model"posts 增量：封面"）：工作稿与已发布快照各一列，站内图片地址，NULL = 无封面
-- 只加可空列：已有行为 NULL，draft_hash / pub_hash 不需要重算（contentHash 只在封面非空时纳入）
ALTER TABLE posts ADD COLUMN cover TEXT;
ALTER TABLE posts ADD COLUMN pub_cover TEXT;
