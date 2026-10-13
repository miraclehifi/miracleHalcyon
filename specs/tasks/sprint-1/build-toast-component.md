# build-toast-component: 实现 Toast 与提示队列

**Sprint**: Sprint 1
**序号**: 21
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 Toast 与提示队列
- **影响范围**: `src/components/ui/Toast.tsx`, `tests/unit/ui/toast.test.tsx`
- **不变量**: 不改变依赖任务（build-icon-button-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-08 发布、更新与撤回文章](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md) |
| 设计依据 | [comp](../../ui/components.md) · [tokens](../../ui/design-tokens.md) |

## 唯一测试（红 → 绿）

`tests/unit/ui/toast.test.tsx`（fake timers）：success 4 秒消失且 `role="status"`；error、warning 常驻、点 × 关闭；error 为 `role="alert"`

## DoD（完成定义）

### 实现类
- [ ] `src/components/ui/Toast.tsx` + `useToast()`（页面底部居中，堆叠）
- [ ] `action`（Undo）形态留到 Sprint 2

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[build-icon-button-component](build-icon-button-component.md)

## 影响的文件

- `src/components/ui/Toast.tsx`
- `tests/unit/ui/toast.test.tsx`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
