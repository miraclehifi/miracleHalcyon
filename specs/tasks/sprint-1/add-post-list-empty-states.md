# add-post-list-empty-states: 文章列表空状态与无结果

**Sprint**: Sprint 1
**序号**: 58
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 文章列表空状态与无结果
- **影响范围**: `src/components/ui/EmptyState.tsx`, `src/components/admin/PostListPage.tsx`, `tests/e2e/post-list-empty.spec.ts`
- **不变量**: 不改变依赖任务（add-post-list-pagination）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [list](../../ui/pages/admin-post-list.md) · [comp](../../ui/components.md) |

## 唯一测试（红 → 绿）

[TC-US07 空状态](../../test/features/F-001-文章写作/acceptance/post-management/US-07-tests.md)：无文章时显示"还没有文章"与"写第一篇"并隐藏筛选和分页；筛选无结果显示条件说明与"清除筛选"

## DoD（完成定义）

### 实现类
- [x] `src/components/ui/EmptyState.tsx`
- [x] `PostListPage` 两种空态

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `EmptyState`（`src/components/ui/EmptyState.tsx`）：图标 32px + 标题 + 说明在 `role="status"` 区域，操作在外
- 没有任何文章（`counts.all = 0` 且无关键字）：羽毛图标、"还没有文章"、"写下第一篇，草稿会自动保存"、主按钮"写第一篇"，筛选行用 `hidden` 隐藏（分页本就不显示）
- 筛选无结果：按 admin-post-list.md 写明条件——有关键字"没有标题包含“xyz”的草稿文章"，只有状态筛选"还没有草稿文章"；文字按钮"清除筛选"清空搜索框并回到 `/admin`
- 唯一测试用组件测试（jsdom）：共享本地 D1 无法保证空库，E2E 不可行；UI 脚本补 TC-US07-18，TC-17 注明由组件测试覆盖
- US-07-tests.md v1.2、frontend-unit-tests UT-11 / UT-12 与页面规格对齐（原"没有匹配的文章"）；US-07 在 Sprint 1 的范围（列表、筛选、搜索、分页、空态）已完成，入场动效在 Sprint 2

## 依赖

[add-post-list-pagination](add-post-list-pagination.md)

## 影响的文件

- `src/components/ui/EmptyState.tsx`
- `src/components/admin/PostListPage.tsx`
- `tests/e2e/post-list-empty.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
