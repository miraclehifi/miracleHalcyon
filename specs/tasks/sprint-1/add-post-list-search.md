# add-post-list-search: 文章列表标题搜索

**Sprint**: Sprint 1
**序号**: 56
**状态**: completed
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
- [x] `src/components/ui/SearchInput.tsx`（手机字号 16px）
- [x] `PostListPage` 接入搜索

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `SearchInput`（`src/components/ui/SearchInput.tsx`）：受控、`type=search`（searchbox 角色），无可见 label 时以 placeholder 作 `aria-label`；手机 16px / 桌面 14px；焦点环加在外框；图标 `search` 登记到 icons.ts
- `PostListPage`：输入停止 300ms 后搜索并回到第 1 页，`replaceState` 写入 `?q=`（不为每次停顿留历史）；筛选切换仍 `pushState`；前进 / 后退同步搜索框；`maxLength=100` 与接口上限一致
- E2E 断言连续输入只发 1 次列表请求；UI 脚本补 TC-US07-16

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
