# implement-post-repo: 实现文章仓储（D1）

**Sprint**: Sprint 1
**序号**: 32
**状态**: pending
**类别**: DATA
**架构层级**: 数据层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现文章仓储（D1）
- **影响范围**: `src/domains/post/repo.ts`, `tests/integration/post/post-repo.test.ts`
- **不变量**: 不改变依赖任务（create-d1-init-migration、implement-post-status-derivation）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-03 新建与编辑文章](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-03-edit-post-info/behaviors.md) |
| User Story | [US-06 自动保存草稿](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/behaviors.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [post](../../engineering/backend/domains/post/domain-model.md) · [postdata](../../engineering/backend/domains/post/data-model.md) |

## 唯一测试（红 → 绿）

`tests/integration/post/post-repo.test.ts`：insert → get 往返（标签 JSON）；updateDraft 不改 pub_* 列；setPublished 写入 / 清空快照；slugTaken 命中他人工作稿与他人快照、不命中自己

## DoD（完成定义）

### 实现类
- [ ] `src/domains/post/repo.ts`：`insert`、`get`、`updateDraft`、`setPublished`、`slugTaken`（`delete`、`list`、`tags` 由后续任务补充）

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[create-d1-init-migration](create-d1-init-migration.md), [implement-post-status-derivation](implement-post-status-derivation.md)

## 影响的文件

- `src/domains/post/repo.ts`
- `tests/integration/post/post-repo.test.ts`

## 回滚策略

回退本任务新增 / 修改的仓储文件与测试；迁移类任务额外执行 `wrangler d1 migrations` 回退（本地删除 `.wrangler/state` 重新应用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
