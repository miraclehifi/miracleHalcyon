# build-confirm-dialog-component: 实现 ConfirmDialog

**Sprint**: Sprint 1
**序号**: 24
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 ConfirmDialog
- **影响范围**: `src/components/ui/ConfirmDialog.tsx`, `tests/unit/ui/confirm-dialog.test.tsx`
- **不变量**: 不改变依赖任务（build-button-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [comp](../../ui/components.md) · [editpage](../../ui/pages/admin-post-editor.md) |

## 唯一测试（红 → 绿）

`tests/unit/ui/confirm-dialog.test.tsx`：打开时背景 `inert`、初始焦点在"取消"、Tab 不出框、Esc / 点遮罩 = 取消、关闭后焦点回到触发按钮

## DoD（完成定义）

### 实现类
- [x] `src/components/ui/ConfirmDialog.tsx`（tone danger / default）

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- Portal 到 `document.body`，打开时给 body 其余子元素设 `inert` 属性（用 setAttribute，jsdom 不反射 `inert` 属性）\n- 遮罩用 `scrim` 令牌 37%，设计稿是未令牌化的 `#2A251F` 35%，已记入 components.md"已知差异"

## 依赖

[build-button-component](build-button-component.md)

## 影响的文件

- `src/components/ui/ConfirmDialog.tsx`
- `tests/unit/ui/confirm-dialog.test.tsx`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
