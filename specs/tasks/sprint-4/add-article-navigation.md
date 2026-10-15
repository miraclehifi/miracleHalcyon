# add-article-navigation: 同标签文章与上一篇 / 下一篇

**Sprint**: Sprint 4
**序号**: 13
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层 + 领域层（reader 纯函数）
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: `relatedPosts`、`adjacentPosts`；`TagPostsNav`（宽屏左栏，sticky；窄屏 `/Mobile` 在文末）；`PostPager`（纸张内最后一块，缺一侧留空、都没有不渲染、手机上下排列）；三栏布局骨架（左栏 / 纸张 / 右栏占位，无左栏时居中）
- **影响范围**: `src/lib/reader/{related,adjacent}.ts`、`src/components/reader/{TagPostsNav,PostPager}.astro`、`src/pages/posts/[slug].astro`
- **不变量**: 正文结构与标题区不变
- **不在本任务**: 右栏目录与进度（add-reading-progress-toc）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-08](../../product/features/F-002-博客首页与阅读/stories/post-reading/US-08-reading-sidebars/story.md) AC1（左栏）、AC2、AC5（同标签移到文末）；[US-09](../../product/features/F-002-博客首页与阅读/stories/post-reading/US-09-prev-next/story.md) |
| 设计依据 | [reader-post-detail.md 布局、左栏、文末](../../ui/pages/reader-post-detail.md) · admin.pen 05 / 05m |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US08-02](../../test/features/F-002-博客首页与阅读/acceptance/post-reading/US-08-tests.md)（READER-UT-04）：同标签排序与上限 | 单元 |
| 2 | TC-US08-03：无同标签文章时不显示（宽 / 窄屏） | E2E |
| 3 | [TC-US09-01](../../test/features/F-002-博客首页与阅读/acceptance/post-reading/US-09-tests.md)：文末相邻文章（跳过草稿与撤回） | E2E |
| 4 | TC-US09-02：首尾只显示一侧 | E2E |
| 5 | TC-US09-03（READER-UT-05）：相邻计算纯函数 | 单元 |

## DoD（完成定义）

### 实现类
- [ ] `PostPager`、`TagPostsNav` 与 components.md 一致

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/e2e/reader-article.spec.ts`——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-article-page](add-article-page.md)

## 影响的文件

- `src/lib/reader/related.ts`、`adjacent.ts`
- `src/components/reader/TagPostsNav.astro`、`PostPager.astro`
- `src/pages/posts/[slug].astro`
- `tests/unit/reader/{related,adjacent}.test.ts`、`tests/e2e/reader-navigation.spec.ts`

## 回滚策略

移除左栏与文末导航

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `TagPostsNav`、`PostPager` 标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
