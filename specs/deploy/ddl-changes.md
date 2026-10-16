# DDL 变更清单

**最后更新**: 2026-10-16

> implement 检测到 DDL 时追加；部署前执行 `⏳ 待执行` 的条目，完成后改为 `✅ 已执行`。线上 D1 迁移命令：`npx wrangler d1 migrations apply DB --remote`（按 `d1_migrations` 表跳过已应用的迁移）。

| 状态 | 迁移文件 | 内容 | 来源 | 注意 |
|------|---------|------|------|------|
| ✅ 已执行（2026-10-16） | `src/db/migrations/0002_raise_image_size_limit.sql` | 重建 `images` 表，`size` 上限 5,242,880 → 52,428,800；数据、索引、触发器保留 | [raise-image-size-limit](../backlog/raise-image-size-limit.md) | 必须先于代码部署：新代码接受 > 5MB 图片，旧约束会让写入 D1 失败（500）。本地已应用，989 行保留 |
| ✅ 已执行（2026-10-16） | `src/db/migrations/0003_post_cover.sql` | `posts` 新增可空列 `cover`、`pub_cover`（文章封面） | F-002 Sprint 4 [add-post-cover-api](../tasks/sprint-4/add-post-cover-api.md) | 必须先于代码部署：新代码读写这两列。只加可空列，旧哈希不变（不会产生"有未发布修改"）。本地已应用，13,270 行保留 |
