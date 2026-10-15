# add-reader-layout: 读者端外壳：顶栏、页脚、返回与 404

**Sprint**: Sprint 4
**序号**: 3
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 新建 `ReaderLayout`（基于 `BaseLayout`）与 `SiteHeader` / `SiteNav`（桌面文字项 + 图标、手机图标化、当前项 `aria-current`、外链按 `site.ts` 显示）/ `SiteFooter` / `BackLink`、`NotFound` 与 `src/pages/404.astro`；`src/config/site.ts` 占位配置与 `normalizeSiteConfig`（本任务只用到 github / photo / name）。主题切换按钮位置先放静态图标（交互在 add-theme-toggle）
- **影响范围**: `src/layouts/ReaderLayout.astro`、`src/components/reader/{SiteHeader,SiteNav,SiteFooter,BackLink,NotFound}.astro`、`src/pages/404.astro`、`src/config/site.ts`、`src/lib/reader/site-config.ts`
- **不变量**: 读者端不出现 `/admin` 链接；`/admin/**` 未登录仍跳登录页（404 页不接管）
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-01](../../product/features/F-002-博客首页与阅读/stories/reader-site/US-01-reader-shell/story.md) AC1、AC3–AC6 |
| 设计依据 | [reader-shell.md](../../ui/pages/reader-shell.md) · [components.md 读者端区块](../../ui/components.md) · admin.pen 05 / 07 / 08 |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US01-01](../../test/features/F-002-博客首页与阅读/acceptance/reader-site/US-01-tests.md)：桌面顶栏导航、外链属性、当前项高亮 | E2E |
| 2 | TC-US01-05：手机顶栏图标化与 44px | E2E |
| 3 | TC-US01-06：`> cd ..` 目标与首页不显示 | E2E |
| 4 | TC-US01-07 + TC-US01-08：未知路径 404 页；读者端无 `/admin` 链接 | E2E |

## ⚠️ 前置确认项

- 本任务时首页、列表、详情页尚未实现：TC-US01-01 / 06 中涉及的页面先用 spike 留下的最小页面或随对应任务补跑，在任务文件中记录补跑点

## DoD（完成定义）

### 实现类
- [x] 组件名、variant 与 components.md 一致；`BackLink` 引用设计稿组件
- [x] `normalizeSiteConfig` 对空外链省略
- [x] 404 页返回 HTTP 404

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：F-001 中未登录访问 `/admin/**` 的用例（`tests/e2e/auth*.spec.ts`）——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[spike-reader-prerender](spike-reader-prerender.md)

## 影响的文件

- `src/layouts/ReaderLayout.astro`
- `src/components/reader/*.astro`（5 个）
- `src/pages/404.astro`、`src/config/site.ts`、`src/lib/reader/site-config.ts`
- `tests/e2e/reader-shell.spec.ts`

## 回滚策略

删除新建文件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [reader-shell.md](../../ui/pages/reader-shell.md) | 标注已实现 |
| [components.md](../../ui/components.md) | `SiteHeader`、`SiteNav`、`SiteFooter`、`BackLink`、`NotFound` 标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
