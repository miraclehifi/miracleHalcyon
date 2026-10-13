# implement-list-posts-endpoint: 实现 GET /api/admin/posts

**Sprint**: Sprint 1
**序号**: 43
**状态**: completed
**类别**: API
**架构层级**: 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 GET /api/admin/posts
- **影响范围**: `src/pages/api/admin/posts/index.ts`, `tests/integration/post/list-endpoint.test.ts`
- **不变量**: 不改变依赖任务（implement-post-list-query、implement-create-post-endpoint）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [postapi](../../engineering/backend/domains/post/api-contract.md) |

## 唯一测试（红 → 绿）

`tests/integration/post/list-endpoint.test.ts`：响应结构 `{ items, page, pageSize, total, counts }`；非法 status / page → 400

## DoD（完成定义）

### 实现类
- [x] `src/pages/api/admin/posts/index.ts`（GET）

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- 实测发现 D1 限制 LIKE 模式 ≤ 50 字节：100 字搜索词报 `LIKE or GLOB pattern too complex`。列表搜索改为 `instr(lower(title), lower(?))`，同时省去转义；domain-model §6 已更新

## 依赖

[implement-post-list-query](implement-post-list-query.md), [implement-create-post-endpoint](implement-create-post-endpoint.md)

## 影响的文件

- `src/pages/api/admin/posts/index.ts`
- `tests/integration/post/list-endpoint.test.ts`

## 回滚策略

删除本任务新增的路由文件与测试；路由删除后对应接口返回 404，不影响已有数据

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
