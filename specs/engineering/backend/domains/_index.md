# Domain 注册表

**最后更新**: 2026-10-13

| Domain | 类型 | 职责 | 引入 Feature | 使用 Feature | 文档 |
|--------|------|------|-------------|-------------|------|
| `auth` | 支撑 | 管理员凭据校验、会话、登录限流 | F-001 | F-001 | [domain-model](auth/domain-model.md) · [api](auth/api-contract.md) · [data](auth/data-model.md) |
| `post` | 核心 | 文章工作稿 / 已发布快照、发布状态流转、已发布只读查询 | F-001 | F-001（写）、F-002（读） | [domain-model](post/domain-model.md) · [api](post/api-contract.md) · [data](post/data-model.md) |
| `media` | 支撑 | 图片与实况视频上传、R2 存取、图片读取路由 | F-001 | F-001（写）、F-002（读 URL） | [domain-model](media/domain-model.md) · [api](media/api-contract.md) · [data](media/data-model.md) |

非 Domain 的共享模块（前端 / 同构）：[markdown](../../frontend/modules/markdown/module-spec.md)、[editor](../../frontend/modules/editor/module-spec.md)、[media-upload](../../frontend/modules/media-upload/module-spec.md)。

## 通用约定

| 项 | 约定 |
|----|------|
| 运行时 | Cloudflare Workers（Astro API 路由），D1 绑定 `DB`、R2 绑定 `MEDIA` |
| 分层 | `src/domains/{domain}/`：`*.ts` 纯领域逻辑（无 I/O，可在 Node 中单测）→ `repo.ts`（D1/R2 访问）→ `service.ts`（编排）；API 路由只调 service |
| 错误体 | `{ "error": { "code": "SLUG_TAKEN", "message": "slug 已存在，请换一个" } }`；`message` 为可直接展示的中文 |
| 时间、枚举、ID | 见 [shared-field-formats.md](../../shared-field-formats.md) |
| 审计列 | 每张表含 `db_create_time`、`db_update_time`（D1/SQLite 版写法见各 data-model，MySQL 规则在 SQLite 上的等价实现） |
| 迁移 | `migrations/NNNN_{name}.sql`，`wrangler d1 migrations apply` |
