# build-post-list-page: 实现文章列表页（主干）

**Sprint**: Sprint 1
**序号**: 54
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 实现文章列表页（主干）
- **影响范围**: `src/pages/admin/index.astro`, `src/components/admin/PostListPage.tsx`, `src/components/admin/AdminHeader.tsx`, `tests/e2e/post-list.spec.ts`
- **不变量**: 不改变依赖任务（build-post-list-item、implement-list-posts-endpoint、build-button-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [list](../../ui/pages/admin-post-list.md) |

## 唯一测试（红 → 绿）

[TC-US07 列表按更新时间倒序](../../test/features/F-001-文章写作/acceptance/post-management/US-07-tests.md)：登录后进入 `/admin` 看到全部文章（含草稿）按更新时间倒序；点"新建文章"进入 `/admin/posts/new`

## DoD（完成定义）

### 实现类
- [ ] `src/pages/admin/index.astro`（SSR 首屏数据）+ `src/components/admin/PostListPage.tsx` + `AdminHeader`（"登出"按钮占位，Sprint 2 接线）+ `PageHeader`
- [ ] 加载中骨架、加载失败"重试"

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[build-post-list-item](build-post-list-item.md), [implement-list-posts-endpoint](implement-list-posts-endpoint.md), [build-button-component](build-button-component.md)

## 影响的文件

- `src/pages/admin/index.astro`
- `src/components/admin/PostListPage.tsx`
- `src/components/admin/AdminHeader.tsx`
- `tests/e2e/post-list.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
