# add-article-page: 文章详情页：正文渲染与标题区

**Sprint**: Sprint 4
**序号**: 4
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层 + 领域层（reader 纯函数）
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 新建 `src/pages/posts/[slug].astro`（`getStaticPaths` 由虚拟模块生成）：纸张 `Paper`、`ArticleHeader`（`formatLongDate`、`readingStats`、`updatedDate`、标签链接）、`ArticleContent`（`renderMarkdown` → `prepareArticleHtml`：h1 降级、标题 id；`set:html`；Expressive Code 样式只输出一次）；`tagSlug`（标签链接用）；草稿 / 不存在 slug 不生成页面
- **影响范围**: `src/pages/posts/[slug].astro`、`src/components/reader/{ArticleHeader,ArticleContent}.astro`、`src/lib/reader/{reading-stats,article-html,tags}.ts`、`package.json`（`rehype-parse`、`github-slugger`、`mdast-util-to-string` 改为直接依赖）
- **不变量**: `renderMarkdown` 不改（引用署名在 add-article-typography）；预览输出不变
- **不在本任务**: 段首缩进 / 首字下沉 / 署名样式（add-article-typography）；三栏（add-reading-progress-toc、add-article-navigation）；图片水合（hydrate-article-images）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-07](../../product/features/F-002-博客首页与阅读/stories/post-reading/US-07-article-typography/story.md) AC1、AC2、AC5 |
| 设计依据 | [reader-post-detail.md](../../ui/pages/reader-post-detail.md)"标题区""正文" · [reader module-spec §2](../../engineering/frontend/modules/reader/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US07-01](../../test/features/F-002-博客首页与阅读/acceptance/post-reading/US-07-tests.md)：构建时渲染与预览渲染输出一致 | 集成 |
| 2 | TC-US07-02 + TC-US07-04：详情页正文结构（单一 h1、标题 id、高亮）与标题区（长日期、字数时长、更新于、标签） | E2E |
| 3 | TC-US07-05 + READER-UT-06：`readingStats` / `updatedDate` / `formatLongDate` | 单元 |
| 4 | TC-US07-10 + TC-US07-11：正文 HTML 清洗；草稿 / 撤回 / 不存在 / 大小写不符 slug 为 404 | 单元 + E2E |
| 5 | READER-UT-07（h1 降级、标题 id 去重、toc 提取部分） | 单元 |

## DoD（完成定义）

### 实现类
- [ ] 页面 `prerender = true`，`getStaticPaths` 只来自 `virtual:reader-data`
- [ ] Expressive Code 的 `<style>` / 复制脚本在页面中只出现一次
- [ ] 新增依赖用最新版

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/unit/markdown/*`（未改动，确认依赖升级不影响）——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[build-reader-data-source](build-reader-data-source.md)、[add-reader-layout](add-reader-layout.md)

## 影响的文件

- `src/pages/posts/[slug].astro`
- `src/components/reader/ArticleHeader.astro`、`ArticleContent.astro`
- `src/lib/reader/reading-stats.ts`、`article-html.ts`、`tags.ts`
- `package.json`
- `tests/unit/reader/*.test.ts`、`tests/integration/reader/render-parity.test.ts`、`tests/e2e/reader-article.spec.ts`

## 回滚策略

删除页面、组件与纯函数文件，移除新增依赖

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [reader-post-detail.md](../../ui/pages/reader-post-detail.md) | 标题区、正文标注已实现 |
| [reader module-spec](../../engineering/frontend/modules/reader/module-spec.md) | 对应函数标注已实现 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
