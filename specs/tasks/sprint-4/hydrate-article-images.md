# hydrate-article-images: 详情页正文图片水合

**Sprint**: Sprint 4
**序号**: 6
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 新建 `ArticleImagesIsland`（`client:idle`，仅 `prepareArticleHtml().hasImages` 时渲染）：查询正文中的 `figure[data-article-image]` / `div[data-gallery]`，按预览同一套宿主替换方式 portal 渲染 `ArticleImage` / `ImageGallery`（宽图 `--article-bleed` 45px），建立图片索引；`ArticleImage` 新增可选 `onClick`（外层 `button`，`aria-label="查看大图：{alt}"`），本任务只记录点击、不打开灯箱
- **影响范围**: `src/components/reader/ArticleImagesIsland.tsx`、`src/components/article/ArticleImage.tsx`（新增 `onClick`）、`src/pages/posts/[slug].astro`
- **不变量**: 预览中 `ArticleImage` 不传 `onClick` 时 DOM 与行为不变；无图文章不加载 React
- **不在本任务**: 灯箱（add-lightbox）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-10](../../product/features/F-002-博客首页与阅读/stories/post-reading/US-10-image-lightbox/story.md) AC1 |
| 设计依据 | [reader-post-detail.md 图片与灯箱](../../ui/pages/reader-post-detail.md) · [reader module-spec §4.2](../../engineering/frontend/modules/reader/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US10-01](../../test/features/F-002-博客首页与阅读/acceptance/post-reading/US-10-tests.md)：图注、宽图、网格 3 列、手风琴默认展开、实况悬停播放、预留宽高比 | E2E |
| 2 | TC-US10-02：加载过程 CLS < 0.1 | E2E（性能） |
| 3 | UT-228：图片索引顺序（单图、网格、手风琴、实况） | 组件 |
| 4 | `ArticleImage` 不传 `onClick` 时结构与快照一致（预览回归） | 组件 |

## DoD（完成定义）

### 实现类
- [ ] `ArticleImage.onClick` 写入 components.md
- [ ] 无图文章页面不包含 React 运行时脚本

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：`tests/unit/components/article-image.test.tsx`、`tests/e2e/image-layout.spec.ts`（预览图片）——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

[add-article-page](add-article-page.md)

## 影响的文件

- `src/components/reader/ArticleImagesIsland.tsx`
- `src/components/article/ArticleImage.tsx`
- `src/pages/posts/[slug].astro`
- `tests/e2e/reader-images.spec.ts`、`tests/unit/components/article-images-island.test.tsx`

## 回滚策略

移除岛（正文图片退回静态 `figure > img`）；还原 `ArticleImage`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `ArticleImage` 新增 `onClick` |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
