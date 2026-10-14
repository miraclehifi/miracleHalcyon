# implement-unpublish-action: 实现"撤回为草稿"操作

**Sprint**: Sprint 1
**序号**: 69
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现"撤回为草稿"操作
- **影响范围**: `src/components/admin/editor/PostSettingsDrawer.tsx`, `src/components/admin/editor/PublishActions.tsx`, `tests/e2e/editor-unpublish.spec.ts`
- **不变量**: 不改变依赖任务（implement-publish-update-action、implement-unpublish-endpoint、build-confirm-dialog-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) |

## 唯一测试（红 → 绿）

[TC-US08 撤回为草稿](../../test/features/F-001-文章写作/acceptance/post-management/US-08-tests.md)：设置抽屉"撤回为草稿"→ 确认框 → 确认后徽标"草稿"、提示"已撤回为草稿"，`GET /api/posts/:slug` 返回 404，内容保留

## DoD（完成定义）

### 实现类
- [x] 设置抽屉"撤回为草稿"（仅已发布显示）+ 撤回确认框

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `UnpublishAction`（`PublishActions.tsx`）：次按钮"撤回为草稿"→ `ConfirmDialog`（标题"撤回为草稿？"，正文"文章将对读者不可见，内容会保留，之后可以重新发布。"，按钮"取消" / "撤回为草稿"，图标 `undo-2`）→ `POST /unpublish`；成功提示"已撤回为草稿"，失败"撤回失败，请重试"
- `PostSettingsDrawer` 新增 `unpublishAction` 插槽（抽屉底部、分隔线上方）；`PostEditorPage` 仅已发布时传入；文章 id 另存 state 供渲染（ref 仍供发布时读取）
- 保存、发布、撤回的响应统一经 `syncServer` 更新徽标与主按钮
- 全量 E2E 在 30 个用例并行时偶发超时（预览 300ms、WebKit 自动保存各出现过一次），单独重复运行均通过（autosave webkit 12/12），判断为并行负载所致，留待 verify 阶段处理

## 依赖

[implement-publish-update-action](implement-publish-update-action.md), [implement-unpublish-endpoint](implement-unpublish-endpoint.md), [build-confirm-dialog-component](build-confirm-dialog-component.md)

## 影响的文件

- `src/components/admin/editor/PostSettingsDrawer.tsx`
- `src/components/admin/editor/PublishActions.tsx`
- `tests/e2e/editor-unpublish.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
