# add-post-list-status-filter: 文章列表状态筛选

**Sprint**: Sprint 1
**序号**: 55
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 文章列表状态筛选
- **影响范围**: `src/components/admin/PostListPage.tsx`, `tests/e2e/post-list-filter.spec.ts`
- **不变量**: 不改变依赖任务（build-post-list-page、build-segmented-control-component）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [list](../../ui/pages/admin-post-list.md) |

## 唯一测试（红 → 绿）

[TC-US07 状态筛选](../../test/features/F-001-文章写作/acceptance/post-management/US-07-tests.md)：全部 / 草稿 / 已发布筛选结果与数量正确，同步到 URL `?status=`，切换后回到第 1 页

## DoD（完成定义）

### 实现类
- [x] `PostListPage` 筛选行（分段控件带数量）

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- URL 状态：`src/lib/admin/list-query.ts`（`parseListQuery` 容错回默认值、`buildListQuery` 省略默认值，UT-15 / UT-16 语义）；SSR 页面用同一解析，刷新保持筛选；页码规则 `isPageParam` 移到这里，`lib/api/http.ts` 转导出
- 筛选切换：`pushState` 写入 URL（回到第 1 页），`popstate` 按地址栏恢复；只采用最新一次请求的结果
- 加载中：有旧数据时保留列表并降到 50% 不透明度（`aria-busy`），无数据时骨架；"共 N 篇"取 `counts.all`，分段控件数量取 `counts`
- E2E 以唯一前缀 + 不变量断言（每行状态一致、分段数量 = 接口 total）；UI 脚本补 TC-US07-15
- ⚠️ 过程记录：上一任务手动起的 preview 子进程残留占用 4321，E2E 一度复用旧构建；已停掉并用全新构建重跑全部 E2E（8/8）

## 依赖

[build-post-list-page](build-post-list-page.md), [build-segmented-control-component](build-segmented-control-component.md)

## 影响的文件

- `src/components/admin/PostListPage.tsx`
- `tests/e2e/post-list-filter.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
