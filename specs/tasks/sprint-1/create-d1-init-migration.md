# create-d1-init-migration: 创建 D1 初始迁移

**Sprint**: Sprint 1
**序号**: 5
**状态**: pending
**类别**: DATA
**架构层级**: 数据层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 创建 D1 初始迁移
- **影响范围**: `migrations/0001_init.sql`, `tests/integration/migration.test.ts`, `package.json`
- **不变量**: 不改变依赖任务（setup-workers-test-pool）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | —（基础设施 / 通用组件）|
| 设计依据 | [authdata](../../engineering/backend/domains/auth/data-model.md) · [postdata](../../engineering/backend/domains/post/data-model.md) · [mediadata](../../engineering/backend/domains/media/data-model.md) |

## 唯一测试（红 → 绿）

`tests/integration/migration.test.ts`：应用迁移后 `sqlite_master` 中存在 posts、sessions、login_attempts、images 四张表及全部索引、触发器；`UPDATE posts …` 后 `db_update_time` 变化

## DoD（完成定义）

### 实现类
- [ ] `migrations/0001_init.sql` 包含 auth、post、media 三个 data-model 中的全部 DDL（原样）
- [ ] `npm run db:migrate:local` 脚本可用

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[setup-workers-test-pool](setup-workers-test-pool.md)

## 影响的文件

- `migrations/0001_init.sql`
- `tests/integration/migration.test.ts`
- `package.json`

## 回滚策略

回退本任务新增 / 修改的仓储文件与测试；迁移类任务额外执行 `wrangler d1 migrations` 回退（本地删除 `.wrangler/state` 重新应用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
