# 跨 Feature 共享 Domain

**最后更新**: 2026-10-13

> Domain 注册表见 [backend/domains/_index.md](backend/domains/_index.md)。本文件只记录被多个 Feature 使用的 Domain / 模块及其对外契约。

| Domain / 模块 | 提供方 | 使用方 | 对外契约 | 约束 |
|---------------|-------|-------|---------|------|
| `post` | F-001 | F-002 | `PublishedPostQuery`（`src/domains/post/published-query.ts`）、`GET /api/posts[/:slug]`、`PublicationHooks.onPublicationChanged` | F-002 只读已发布快照，不得读写工作稿列；缓存失效由 F-002 实现钩子 |
| `media` | F-001 | F-002 | `GET /img/*`（含 `.live.mp4`，支持 Range） | URL 自描述，F-002 不查 `images` 表 |
| `markdown` | F-001 | F-002 | `renderMarkdown`、`parseImageKey`、`parseMarks`、图片 HTML 结构（`data-article-image`、`data-gallery`） | F-002 不得另写渲染规则 |
| 图片组件 `ArticleImage`、`LiveBadge`、`ImageGallery` | F-001 | F-002 | components.md"文章图片" | `Lightbox` 归 F-002 |
