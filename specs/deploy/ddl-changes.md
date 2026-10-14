# DDL 变更清单

**最后更新**: 2026-10-14

> implement 检测到 DDL 时追加；部署前执行 `⏳ 待执行` 的条目，完成后改为 `✅ 已执行`。线上 D1 迁移命令：`npx wrangler d1 migrations apply DB --remote`（按 `d1_migrations` 表跳过已应用的迁移）。

| 状态 | 迁移文件 | 内容 | 来源 | 注意 |
|------|---------|------|------|------|
| ⏳ 待执行 | `src/db/migrations/0002_raise_image_size_limit.sql` | 重建 `images` 表，`size` 上限 5,242,880 → 52,428,800；数据、索引、触发器保留 | [raise-image-size-limit](../backlog/raise-image-size-limit.md) | 必须先于代码部署：新代码接受 > 5MB 图片，旧约束会让写入 D1 失败（500）。本地已应用，989 行保留 |
