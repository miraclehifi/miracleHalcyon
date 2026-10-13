# add-post-list-pagination: 文章列表分页

**Sprint**: Sprint 1
**序号**: 57
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 文章列表分页
- **影响范围**: `src/components/ui/Pagination.tsx`, `src/components/admin/PostListPage.tsx`, `tests/e2e/post-list-pagination.spec.ts`
- **不变量**: 不改变依赖任务（add-post-list-search）已通过的测试结果

## 产品需求来源

| 来源 | 链接 |
|------|------|
| Feature | [F-001](../../product/features/F-001-文章写作/feature-scope.md) |
| User Story | [US-07 后台文章列表](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md) |
| 设计依据 | [list](../../ui/pages/admin-post-list.md) · [comp](../../ui/components.md) |

## 唯一测试（红 → 绿）

[TC-US07 分页](../../test/features/F-001-文章写作/acceptance/post-management/US-07-tests.md)：23 篇文章时第 1 页 20 篇、第 2 页 3 篇，"第 1–20 篇，共 23 篇"；只有 1 页时隐藏分页

## DoD（完成定义）

### 实现类
- [x] `src/components/ui/Pagination.tsx`
- [x] `PostListPage` 接入 `?page=`

### 测试类
- [x] 变更点测试：上述"唯一测试"由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含依赖任务的测试）
- [x] `npm run lint` 与 `astro check` 无错误

## 实现记录

- `Pagination`（`src/components/ui/Pagination.tsx`）：`page / pageSize / total / href / onNavigate`；页码与上 / 下一页是真实链接（带修饰键时交给浏览器），普通点击走客户端加载并回到页顶；首末页的上 / 下一页渲染为 `aria-disabled` 文本；只有 1 页时不渲染（UT-19）；手机可点区域 44px；`getPageCount` 同文件导出（UT-18）
- 页码全部显示、可换行（规格未定义页数很多时的折叠规则，个人博客每页 20 篇，页数有限）
- 筛选用例改为带唯一关键字搜索，分段数量随关键字精确断言（原写法与并行的分页用例造数据冲突，全量 E2E 时偶发失败）
- 过程记录：shell 循环连续两次跑 `test:e2e` 时第二次全部失败（上一次的 preview 尚未退出被复用），单独 / 间隔运行 3 次均 12/12，与代码无关

## 依赖

[add-post-list-search](add-post-list-search.md)

## 影响的文件

- `src/components/ui/Pagination.tsx`
- `src/components/admin/PostListPage.tsx`
- `tests/e2e/post-list-pagination.spec.ts`

## 回滚策略

回退本任务新增 / 修改的组件与测试文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-1/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| 设计依据文档 | 标注"已实现"（接口 / 组件 / 模块） |
