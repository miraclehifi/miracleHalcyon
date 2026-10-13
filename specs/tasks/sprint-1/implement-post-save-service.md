# implement-post-save-service: 实现新建与自动保存服务

**Sprint**: Sprint 1
**序号**: 33
**状态**: pending
**类别**: DOMAIN
**架构层级**: 领域层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现新建与自动保存服务
- **影响范围**: `src/domains/post/service.ts`, `tests/unit/post/save-service.test.ts`
- **不变量**: 不改变依赖任务（implement-post-status-derivation、implement-post-content-normalize）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-03 新建与编辑文章](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/behaviors.md) |
| User Story | [US-06 自动保存草稿](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/behaviors.md) |
| 设计依据 | [post](../../engineering/backend/domains/post/domain-model.md) |

## 唯一测试（红 → 绿）

POST-UT-07：已发布文章 `saveDraft` 新内容后 `published`、`lastPublishedAt` 不变，`hasUnpublishedChanges` 为 true（内存仓储）

## DoD（完成定义）

### 实现类
- [ ] `PostService.create`、`saveDraft`、`getForEdit`（规范化 → 写工作稿 + draft_hash）

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[implement-post-status-derivation](implement-post-status-derivation.md), [implement-post-content-normalize](implement-post-content-normalize.md)

## 影响的文件

- `src/domains/post/service.ts`
- `tests/unit/post/save-service.test.ts`

## 回滚策略

删除本任务新增的领域文件与测试（纯函数 / 服务，无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
