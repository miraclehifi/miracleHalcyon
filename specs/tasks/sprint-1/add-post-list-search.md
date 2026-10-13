# add-post-list-search: 文章列表标题搜索

**Sprint**: Sprint 1
**序号**: 56
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 文章列表标题搜索
- **影响范围**: `src/components/ui/SearchInput.tsx`, `src/components/admin/PostListPage.tsx`, `tests/e2e/post-list-search.spec.ts`
- **不变量**: 不改变依赖任务（add-post-list-status-filter）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [list](../../ui/pages/admin-post-list.md) · [comp](../../ui/components.md) |

## 唯一测试（红 → 绿）

[TC-US07 标题搜索](../../test/features/F-001-文章写作/acceptance/post-management/US-07-tests.md)：输入关键字停止 300ms 后只显示标题包含关键字的文章，同步到 `?q=`

## DoD（完成定义）

### 实现类
- [ ] `src/components/ui/SearchInput.tsx`（手机字号 16px）
- [ ] `PostListPage` 接入搜索

### 测试类
- [ ] 变更点测试：上述"唯一测试"由红变绿
- [ ] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [ ] `npm run lint` 与 `astro check` 无错误

## 依赖

[add-post-list-status-filter](add-post-list-status-filter.md)

## 影响的文件

- `src/components/ui/SearchInput.tsx`
- `src/components/admin/PostListPage.tsx`
- `tests/e2e/post-list-search.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
