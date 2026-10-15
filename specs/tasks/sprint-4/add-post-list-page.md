# add-post-list-page: 文章列表 /posts 与分页

**Sprint**: Sprint 4
**序号**: 5
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 新建 `src/pages/posts/index.astro`、`src/pages/posts/page/[page].astro`：`PostsHeader`（"文章" + 篇数）、`PostCardList`（React 岛 `client:visible`，AnimatedList `bare` + `PostCard`：标题链接伪元素扩展、日期、标签链接；摘要暂只用 `summary` 字段）、`Pagination`（SSR 静态，`/posts`、`/posts/page/n`）、空态 `EmptyState`；超出页码不生成
- **影响范围**: `src/pages/posts/index.astro`、`posts/page/[page].astro`、`src/components/reader/{PostsHeader.astro,PostCard.tsx,PostCardList.tsx}`、`src/components/ui/Pagination.tsx`（若需 SSR 适配）
- **不变量**: 后台 `PostList` / `Pagination` 行为不变
- **不在本任务**: 正文截取摘要、封面显示、悬停错位（add-post-card-details）；标签索引（add-tag-pages）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-04](../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-04-post-list/story.md) AC1、AC2、AC6、AC7 |
| 设计依据 | [reader-post-list.md](../../ui/pages/reader-post-list.md) · [components.md 列表动效参数](../../ui/components.md) · admin.pen 07 / 07m |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US04-01](../../test/features/F-002-博客首页与阅读/acceptance/post-browsing/US-04-tests.md)：倒序、总数、不含草稿 | E2E |
| 2 | TC-US04-02：卡片内容与链接结构 | E2E |
| 3 | TC-US04-06 + UT-210–212：分页导航与链接规则 | E2E + 组件 |
| 4 | TC-US04-07 + TC-US04-08：非法页码 404；空列表构建 | E2E + 构建 |

## DoD（完成定义）

### 实现类
- [x] `PostCard` 与 components.md 一致（`active` 由列表控制）
- [x] 第 1 页无 `/posts/page/1` 产物
- [x] `Pagination` 在 SSR 输出中链接可用（不依赖水合）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/unit/components/pagination*.test.tsx`、后台列表 E2E（若改了 `Pagination`）——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[build-reader-data-source](build-reader-data-source.md)、[add-reader-layout](add-reader-layout.md)

## 影响的文件

- `src/pages/posts/index.astro`、`posts/page/[page].astro`
- `src/components/reader/PostsHeader.astro`、`PostCard.tsx`、`PostCardList.tsx`
- `src/components/ui/Pagination.tsx`（可能）
- `tests/e2e/reader-post-list.spec.ts`、`tests/unit/components/post-card*.test.tsx`

## 回滚策略

删除页面与组件；还原 `Pagination.tsx`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [reader-post-list.md](../../ui/pages/reader-post-list.md) | 列表与分页标注已实现 |
| [components.md](../../ui/components.md) | `PostCard`、`PostCardList`、`PostsHeader` 标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
