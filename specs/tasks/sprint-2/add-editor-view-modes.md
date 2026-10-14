# add-editor-view-modes: 写文章页视图切换与窄屏 Tab

**Sprint**: Sprint 2
**序号**: 13
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 宽屏（≥ 768px）顶栏 `SegmentedControl` 切换"编辑 / 并排 / 预览"，选择存 `localStorage['mh:editor:view']`；窄屏（< 768px）改为"编辑 / 预览" Tab
- **影响范围**: `PostEditorPage.tsx`、`EditorTopBar.tsx`、`src/components/ui/Tabs.tsx`（新建）
- **不变量**: 预览渲染、自动保存不受视图切换影响（隐藏的预览不卸载渲染状态）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-04 Markdown 预览](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/behaviors.md) |
| 设计依据 | [admin-post-editor"布局""响应式"](../../ui/pages/admin-post-editor.md) · [components.md `SegmentedControl`、`Tabs`](../../ui/components.md) · feature-architecture §3.1（`mh:editor:view`） |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-52 / UT-55](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：三种视图模式渲染；Tab `role="tablist"`、←→ 切换、`aria-selected` | 单元 |
| 2 | [TC-US04-12](../../test/features/F-001-文章写作/acceptance/post-editor/US-04-tests.md)：宽屏并排与视图切换（含 768 边界），刷新后保持 | E2E |
| 3 | TC-US04-13：窄屏 Tab 切换（含 767 边界） | E2E |

## DoD（完成定义）

### 实现类
- [ ] 视图模式状态 + localStorage 读写（读写包 try/catch，不可用时默认"并排"）
- [ ] `Tabs` 组件按 components.md 命名与变体

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

无

## 影响的文件

- `src/components/admin/editor/PostEditorPage.tsx`、`EditorTopBar.tsx`
- `src/components/ui/Tabs.tsx`（新建）
- `tests/unit/admin/editor-view-mode.test.tsx`、`tests/e2e/editor-view-mode.spec.ts`（新建）

## 回滚策略

回退修改的组件与新增文件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| admin-post-editor"响应式" | 标注"已实现" |
