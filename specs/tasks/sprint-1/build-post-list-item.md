# build-post-list-item: 实现 PostListItem（静态卡片）

**Sprint**: Sprint 1
**序号**: 53
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现 PostListItem（静态卡片）
- **影响范围**: `src/components/admin/PostListItem.tsx`, `tests/unit/admin/post-list-item.test.tsx`
- **不变量**: 不改变依赖任务（build-status-badge-component、implement-relative-time-format、build-icon-button-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [list](../../ui/pages/admin-post-list.md) · [comp](../../ui/components.md) · [ut](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) |

## 唯一测试（红 → 绿）

UT（frontend-unit-tests §2）：标题链接 `href=/admin/posts/:id` 且伪元素扩展可点区域；无标题显示斜体"无标题"；徽标 + 相对时间

## DoD（完成定义）

### 实现类
- [ ] `src/components/admin/PostListItem.tsx`（外框同 PostCard 虚线；左滑抽屉与 `⋯` 交互留到 Sprint 2）

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[build-status-badge-component](build-status-badge-component.md), [implement-relative-time-format](implement-relative-time-format.md), [build-icon-button-component](build-icon-button-component.md)

## 影响的文件

- `src/components/admin/PostListItem.tsx`
- `tests/unit/admin/post-list-item.test.tsx`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
