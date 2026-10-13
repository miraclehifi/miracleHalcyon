# implement-unpublish-endpoint: 实现 POST /api/admin/posts/:id/unpublish

**Sprint**: Sprint 1
**序号**: 45
**状态**: completed
**类别**: API
**架构层级**: 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 POST /api/admin/posts/:id/unpublish
- **影响范围**: `src/pages/api/admin/posts/[id]/unpublish.ts`, `tests/integration/post/unpublish-endpoint.test.ts`
- **不变量**: 不改变依赖任务（implement-post-unpublish-service、implement-get-post-endpoint）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [postapi](../../engineering/backend/domains/post/api-contract.md) |

## 唯一测试（红 → 绿）

`tests/integration/post/unpublish-endpoint.test.ts`：200 `status = draft`；草稿 409 `NOT_PUBLISHED`；404

## DoD（完成定义）

### 实现类
- [x] `src/pages/api/admin/posts/[id]/unpublish.ts`

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 依赖

[implement-post-unpublish-service](implement-post-unpublish-service.md), [implement-get-post-endpoint](implement-get-post-endpoint.md)

## 影响的文件

- `src/pages/api/admin/posts/[id]/unpublish.ts`
- `tests/integration/post/unpublish-endpoint.test.ts`

## 回滚策略

删除本任务新增的路由文件与测试；路由删除后对应接口返回 404，不影响已有数据

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
