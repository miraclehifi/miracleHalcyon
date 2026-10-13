# build-save-indicator-component: 实现 SaveIndicator

**Sprint**: Sprint 1
**序号**: 25
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 SaveIndicator
- **影响范围**: `src/components/ui/SaveIndicator.tsx`, `tests/unit/ui/save-indicator.test.tsx`
- **不变量**: 不改变依赖任务（define-design-token-styles）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-06 自动保存草稿](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/behaviors.md) |
| 设计依据 | [comp](../../ui/components.md) · [editpage](../../ui/pages/admin-post-editor.md) |

## 唯一测试（红 → 绿）

`tests/unit/ui/save-indicator.test.tsx`：4 种 state 的图标与文案；`saved` 显示本地时区 HH:mm（tabular-nums）

## DoD（完成定义）

### 实现类
- [x] `src/components/ui/SaveIndicator.tsx`

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 依赖

[define-design-token-styles](define-design-token-styles.md)

## 影响的文件

- `src/components/ui/SaveIndicator.tsx`
- `tests/unit/ui/save-indicator.test.tsx`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
