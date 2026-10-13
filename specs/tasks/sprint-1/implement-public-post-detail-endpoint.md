# implement-public-post-detail-endpoint: 实现 GET /api/posts/:slug

**Sprint**: Sprint 1
**序号**: 47
**状态**: pending
**类别**: API
**架构层级**: 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 GET /api/posts/:slug
- **影响范围**: `src/pages/api/posts/[slug].ts`, `tests/integration/post/public-detail-endpoint.test.ts`
- **不变量**: 不改变依赖任务（implement-published-query）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [postapi](../../engineering/backend/domains/post/api-contract.md) |

## 唯一测试（红 → 绿）

[TC-US08 发布后读者可读取](../../test/features/F-001-文章写作/acceptance/post-management/US-08-tests.md)（API 层）：发布后 200 返回快照；草稿 / 撤回后 404；`Cache-Control: no-store`

## DoD（完成定义）

### 实现类
- [ ] `src/pages/api/posts/[slug].ts`（公开，不经会话校验）

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[implement-published-query](implement-published-query.md)

## 影响的文件

- `src/pages/api/posts/[slug].ts`
- `tests/integration/post/public-detail-endpoint.test.ts`

## 回滚策略

删除本任务新增的路由文件与测试；路由删除后对应接口返回 404，不影响已有数据

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
