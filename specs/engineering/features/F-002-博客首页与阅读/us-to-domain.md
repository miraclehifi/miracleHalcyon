# F-002 博客首页与阅读 — US → Domain 映射

**最后更新**: 2026-10-15

> 反向映射见 [post domain-model](../../backend/domains/post/domain-model.md) §7"服务的需求"与 [reader module-spec](../../frontend/modules/reader/module-spec.md)；两者必须一致。● 主要承担　○ 参与

| US | post | media | markdown | editor | media-upload | reader | 主要接口 / 函数 |
|----|:----:|:-----:|:--------:|:------:|:------------:|:------:|---------|
| US-01 reader-shell | | | | | | ● | `BaseLayout` 主题脚本、`ThemeToggle`、`ReaderLayout`、`404.astro`、`normalizeSiteConfig` |
| US-02 home-intro | | | | | | ● | `site.ts`、`normalizeSiteConfig`、`HomeIntro` |
| US-03 static-rebuild | ● | | ○ | | | ● | `GET /api/posts[/:slug]`（构建时）、`readerData()` / `virtual:reader-data`、`createDeployHookHooks`（`onPublicationChanged`） |
| US-04 post-list | ○ | ○ | ○ | | | ● | `sortPublished`、`paginate`、`excerptOf`、`groupTags`、`PostCardList` |
| US-05 tag-page | ○ | | | | | ● | `tagSlug`、`groupTags`、`paginate` |
| US-06 post-cover | ● | ○ | ○ | ● | ● | | `PostContent.cover`、迁移 0003、`PUT /api/admin/posts/:id`（`cover`）、`POST /api/admin/images`、`CoverField`、`parseImageKey` |
| US-07 article-typography | ○ | | ● | | | ● | `renderMarkdown`（含 `rehypeQuoteAttribution`）、`prepareArticleHtml`、`readingStats`、`updatedDate`、`formatLongDate` |
| US-08 reading-sidebars | ○ | | | | | ● | `relatedPosts`、`prepareArticleHtml().toc`、`progressOf`、`currentHeading`、`TocDrawer` |
| US-09 prev-next | ○ | | | | | ● | `adjacentPosts` |
| US-10 image-lightbox | | ○ | ○ | | | ● | `ArticleImagesIsland`、`Lightbox`、`ArticleImage.onClick`、`ImageGallery.onImageClick`、`GET /img/*` |
