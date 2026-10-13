# implement-create-post-endpoint: 实现 POST /api/admin/posts

**Sprint**: Sprint 1
**序号**: 40
**状态**: completed
**类别**: API
**架构层级**: 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 POST /api/admin/posts
- **影响范围**: `src/pages/api/admin/posts/index.ts`, `src/lib/api/http.ts`, `tests/integration/post/create-endpoint.test.ts`
- **不变量**: 不改变依赖任务（implement-post-repo、enforce-slug-uniqueness、implement-auth-middleware）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-03 新建与编辑文章](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/behaviors.md) |
| User Story | [US-06 自动保存草稿](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/behaviors.md) |
| 设计依据 | [postapi](../../engineering/backend/domains/post/api-contract.md) |

## 唯一测试（红 → 绿）

`tests/integration/post/create-endpoint.test.ts`：201 + `Location` + PostView 全字段（含 `status = draft`）；400 带 `fields`；409 `SLUG_TAKEN`

## DoD（完成定义）

### 实现类
- [x] `src/pages/api/admin/posts/index.ts`（POST）
- [x] `src/lib/api/http.ts`：统一错误体与 PostView 序列化（id 为字符串、时间 ISO 8601）

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `src/lib/api/http.ts`：`readJson`（1MB 上限）、`parseDraftInput`（类型 + 领域校验合并）、`errorResponse`（领域错误 → 契约错误体）\n- VALIDATION_FAILED 文案按字段给出并以\"；\"拼接（契约 §5\"按字段给出\"）

## 依赖

[implement-post-repo](implement-post-repo.md), [enforce-slug-uniqueness](enforce-slug-uniqueness.md), [implement-auth-middleware](implement-auth-middleware.md)

## 影响的文件

- `src/pages/api/admin/posts/index.ts`
- `src/lib/api/http.ts`
- `tests/integration/post/create-endpoint.test.ts`

## 回滚策略

删除本任务新增的路由文件与测试；路由删除后对应接口返回 404，不影响已有数据

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
