# implement-publish-update-action: 实现"发布更新"操作

**Sprint**: Sprint 1
**序号**: 68
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现"发布更新"操作
- **影响范围**: `src/components/admin/editor/PublishActions.tsx`, `tests/e2e/editor-publish-update.spec.ts`
- **不变量**: 不改变依赖任务（implement-publish-action）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) |

## 唯一测试（红 → 绿）

[TC-US08 更新有修改的文章](../../test/features/F-001-文章写作/acceptance/post-management/US-08-tests.md)：已发布文章修改并自动保存后徽标为"已发布 · 有未发布修改"，"发布更新"可用；点击后读者看到新内容、按钮置灰（`aria-disabled`，提示"没有未发布的修改"）

## DoD（完成定义）

### 实现类
- [x] 主按钮随状态切换为"发布更新"及置灰态

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `PublishActions`：已发布且无修改时"发布更新"`aria-disabled`（仍可聚焦、点击无效），`aria-describedby` 指向"没有未发布的修改"；悬停提示暂用 `title`，Sprint 2 接入 `Tooltip`（US-10）后替换
- 自动保存响应的 `hasUnpublishedChanges` 驱动徽标与按钮：编辑保存后变为可用；发布更新成功后回到置灰，提示"已发布更新"（文案已在 implement-publish-action 中接入）

## 依赖

[implement-publish-action](implement-publish-action.md)

## 影响的文件

- `src/components/admin/editor/PublishActions.tsx`
- `tests/e2e/editor-publish-update.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
