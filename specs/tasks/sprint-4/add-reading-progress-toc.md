# add-reading-progress-toc: 阅读进度、目录与窄屏目录抽屉

**Sprint**: Sprint 4
**序号**: 14
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 右栏 `TableOfContents`（进度百分比 + 进度条 + 目录，sticky）；窄屏 `ReadingProgress/Bar`（顶栏下 sticky 2px）、`TocButton` + `TocDrawer`（原生 `<dialog>`）；原生脚本 `reading.ts`：`progressOf`、`currentHeading`（阅读线 30%）、点击跳转（减弱动效 auto）与 `replaceState`；无 h2 / h3 时不渲染目录与按钮
- **影响范围**: `src/components/reader/{TableOfContents,ReadingProgress,TocDrawer}.astro`、`src/components/reader/reading.ts`、`src/pages/posts/[slug].astro`
- **不变量**: 无 JS 时目录为普通锚点链接
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-08](../../product/features/F-002-博客首页与阅读/stories/post-reading/US-08-reading-sidebars/story.md) AC1（右栏）、AC3–AC6 |
| 设计依据 | [reader-post-detail.md 右栏、手机](../../ui/pages/reader-post-detail.md) · [reader module-spec §3](../../engineering/frontend/modules/reader/module-spec.md) · admin.pen 05m-b |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US08-01](../../test/features/F-002-博客首页与阅读/acceptance/post-reading/US-08-tests.md) + TC-US08-08：宽屏三栏结构；无标题时不显示目录 | E2E |
| 2 | TC-US08-04 + READER-UT-11（UT-213 / 214）：阅读进度与当前章节计算 | E2E + 单元 |
| 3 | TC-US08-05 + TC-US08-06：目录高亮与跳转；减弱动效直接跳转 | E2E |
| 4 | TC-US08-07 + UT-218 / 219：窄屏进度条、目录抽屉开关与焦点、触控尺寸 | E2E |
| 5 | TC-US08-09：目录数据纯函数（`prepareArticleHtml().toc`） | 单元 |

## DoD（完成定义）

### 实现类
- [ ] 滚动监听 rAF 节流、`passive`
- [ ] 抽屉 `aria-label="目录"`、按钮 ≥ 44px

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/e2e/reader-navigation.spec.ts`——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-article-navigation](add-article-navigation.md)

## 影响的文件

- `src/components/reader/TableOfContents.astro`、`ReadingProgress.astro`、`TocDrawer.astro`、`reading.ts`
- `src/pages/posts/[slug].astro`
- `tests/unit/reader/reading.test.ts`、`tests/e2e/reader-toc.spec.ts`

## 回滚策略

移除目录与进度组件（正文不受影响）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [reader-post-detail.md](../../ui/pages/reader-post-detail.md) | 右栏、窄屏目录标注已实现 |
| [components.md](../../ui/components.md) | `TableOfContents`、`ReadingProgress/Bar`、`TocButton`、`TocDrawer` 标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
