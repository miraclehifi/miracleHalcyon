# wire-autosave-to-editor: 写文章页接入自动保存

**Sprint**: Sprint 1
**序号**: 64
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 写文章页接入自动保存
- **影响范围**: `src/components/admin/editor/PostEditorPage.tsx`, `tests/e2e/editor-autosave.spec.ts`
- **不变量**: 不改变依赖任务（implement-autosave-controller、build-markdown-editor-pane、build-post-settings-drawer、build-save-indicator-component、implement-save-post-endpoint）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-06 自动保存草稿](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/behaviors.md) |
| 设计依据 | [editpage](../../ui/pages/admin-post-editor.md) · [editor](../../engineering/frontend/modules/editor/module-spec.md) |

## 唯一测试（红 → 绿）

[TC-US06 停止输入 2 秒自动保存](../../test/features/F-001-文章写作/acceptance/post-editor/US-06-tests.md)：新建页输入正文停止 2 秒后显示"已保存 · HH:mm"，地址换成 `/admin/posts/:id`，刷新后内容仍在

## DoD（完成定义）

### 实现类
- [ ] `PostEditorPage` 把标题、正文、设置抽屉的变化交给 `useAutosave`；`SaveIndicator` 显示状态
- [ ] 有未保存修改时注册 `beforeunload`

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[implement-autosave-controller](implement-autosave-controller.md), [build-markdown-editor-pane](build-markdown-editor-pane.md), [build-post-settings-drawer](build-post-settings-drawer.md), [build-save-indicator-component](build-save-indicator-component.md), [implement-save-post-endpoint](implement-save-post-endpoint.md)

## 影响的文件

- `src/components/admin/editor/PostEditorPage.tsx`
- `tests/e2e/editor-autosave.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
