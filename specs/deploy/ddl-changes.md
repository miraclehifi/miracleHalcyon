# DDL 变更清单

**最后更新**: 2026-10-27

> implement 检测到 DDL 时追加；部署前执行 `⏳ 待执行` 的条目，完成后改为 `✅ 已执行`。线上 D1 迁移命令：`npx wrangler d1 migrations apply DB --remote`（按 `d1_migrations` 表跳过已应用的迁移）。

| 状态 | 迁移文件 | 内容 | 来源 | 注意 |
|------|---------|------|------|------|
| ✅ 已执行（2026-10-16） | `src/db/migrations/0002_raise_image_size_limit.sql` | 重建 `images` 表，`size` 上限 5,242,880 → 52,428,800；数据、索引、触发器保留 | [raise-image-size-limit](../backlog/raise-image-size-limit.md) | 必须先于代码部署：新代码接受 > 5MB 图片，旧约束会让写入 D1 失败（500）。本地已应用，989 行保留 |
| ⏳ 待执行 | `src/db/migrations/0006_shelf_import_state.sql` | 新建 `shelf_import_state` 表（豆瓣导入同步水位，主键 `uid` × `type` × `status`）+ 索引 `idx_shelf_import_state_attempted`、审计触发器 | F-005 Sprint 9 [add-douban-import-api](../tasks/sprint-9/add-douban-import-api.md)、[ADR-014](../engineering/features/F-005-书影音/architecture/adr/ADR-014-douban-bulk-import.md) | 必须先于代码部署：新代码的 `/api/admin/shelf/import*` 读写该表。只新建表，不影响已有数据；`watermark` 的 GLOB 按日期 / 时间两段写（D1 模式上限 50 字符）。本地已应用（2026-10-27） |
| ⏳ 待执行 | `src/db/migrations/0005_shelf_game_platform_cover.sql` | `shelf_entries` 新增可空列 `platform`、`cover_url`、`cover_width`、`cover_height`（各带单列 CHECK）；已有游戏行补 `platform = 'ps5'`、`cover_key` 置空 | F-005 Sprint 9 [add-game-platform-api](../tasks/sprint-9/add-game-platform-api.md)、[ADR-013](../engineering/features/F-005-书影音/architecture/adr/ADR-013-game-cover-igdb-link.md) | 必须在 0004 之后、代码部署之前执行：新代码读写这四列，旧库会让条目接口与 `/api/shelf` 失败（500）。只加可空列；线上若已有游戏行，其 R2 封面对象成为孤儿（不在 `images` 表，F-006 不清理），可手动删除。本地已应用（2026-10-27） |
| ✅ 已执行（2026-10-23，生产 D1 260ef05a…，`wrangler d1 migrations apply DB --remote`；核对：表、2 个索引、触发器均存在） | `src/db/migrations/0004_shelf_entries.sql` | 新建 `shelf_entries` 表（书影音条目）+ 部分唯一索引 `uk_shelf_entries_douban_id`、索引 `idx_shelf_entries_type`、审计触发器 | F-005 Sprint 9 [add-shelf-entry-api](../tasks/sprint-9/add-shelf-entry-api.md) | 必须先于代码部署：新代码的 `/api/admin/shelf/*`、`/api/shelf` 读写该表。只新建表，不影响已有数据。本地已应用 |
| ✅ 已执行（2026-10-16） | `src/db/migrations/0003_post_cover.sql` | `posts` 新增可空列 `cover`、`pub_cover`（文章封面） | F-002 Sprint 4 [add-post-cover-api](../tasks/sprint-4/add-post-cover-api.md) | 必须先于代码部署：新代码读写这两列。只加可空列，旧哈希不变（不会产生"有未发布修改"）。本地已应用，13,270 行保留 |
