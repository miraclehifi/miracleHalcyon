# implement-throttle-repo: 实现限流仓储（D1）

**Sprint**: Sprint 1
**序号**: 11
**状态**: pending
**类别**: DATA
**架构层级**: 数据层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现限流仓储（D1）
- **影响范围**: `src/domains/auth/throttle-repo.ts`, `tests/integration/auth/throttle-repo.test.ts`
- **不变量**: 不改变依赖任务（create-d1-init-migration）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-01 管理员登录](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/behaviors.md) |
| 设计依据 | [auth](../../engineering/backend/domains/auth/domain-model.md) · [authdata](../../engineering/backend/domains/auth/data-model.md) |

## 唯一测试（红 → 绿）

`tests/integration/auth/throttle-repo.test.ts`：put（upsert 两次）→ get 为最新值；delete 后 null

## DoD（完成定义）

### 实现类
- [ ] `src/domains/auth/throttle-repo.ts` 实现 `ThrottleRepo`（`INSERT … ON CONFLICT(ip) DO UPDATE`）

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[create-d1-init-migration](create-d1-init-migration.md)

## 影响的文件

- `src/domains/auth/throttle-repo.ts`
- `tests/integration/auth/throttle-repo.test.ts`

## 回滚策略

回退本任务新增 / 修改的仓储文件与测试；迁移类任务额外执行 `wrangler d1 migrations` 回退（本地删除 `.wrangler/state` 重新应用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
