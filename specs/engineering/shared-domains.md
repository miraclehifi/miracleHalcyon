# 跨 Feature 共享 Domain

**最后更新**: 2026-10-16

> Domain 注册表见 [backend/domains/_index.md](backend/domains/_index.md)。本文件只记录被多个 Feature 使用的 Domain / 模块及其对外契约。

| Domain / 模块 | 提供方 | 使用方 | 对外契约 | 约束 |
|---------------|-------|-------|---------|------|
| `post` | F-001 | F-002 | `PublishedPostQuery`（`src/domains/post/published-query.ts`）、`GET /api/posts[/:slug]`、`PublicationHooks.onPublicationChanged` | F-002 只读已发布快照（构建时经公开接口），不得读写工作稿列；F-002 实现钩子为 `createDeployHookHooks`（`src/lib/rebuild/deploy-hook.ts`）；F-002 增量：`cover` 字段（工作稿 + 快照，迁移 0003） |
| `media` | F-001 | F-002、F-006 | `GET /img/*`（含 `.live.mp4`，支持 Range）；F-006 增量：`StorageService`（存储清理） | URL 自描述，F-002 不查 `images` 表；F-006 清理可单独移除视频（不变量 1） |
| `post`（引用查询） | F-001 | F-006 | `ImageReferenceQuery.classify`（`src/domains/post/image-reference-query.ts`，post domain-model §6.1） | 只读工作稿与快照四列 `body`、`cover`、`pub_body`、`pub_cover`；`media` 不得直接读 `posts` 表 |
| `markdown` | F-001 | F-002 | `renderMarkdown`、`parseImageKey`、`parseMarks`、图片 HTML 结构（`data-article-image`、`data-gallery`）、引用署名（`footer[data-attribution]`，F-002 增量） | F-002 不得另写渲染规则；读者页版式后处理（h1 降级、首字下沉标记、标题 id）在 `src/lib/reader/article-html.ts` |
| 图片组件 `ArticleImage`、`LiveBadge`、`ImageGallery` | F-001 | F-002 | components.md"文章图片" | `Lightbox` 归 F-002；F-002 增量：`ArticleImage` 可选 `onClick`（不传时结构不变） |
| `reader`（无状态模块）、`ReaderLayout`、`virtual:reader-data` | F-002 | F-003 / F-004 / F-005 | [reader module-spec](frontend/modules/reader/module-spec.md) | 后续读者页沿用外壳与构建数据方式；F-004 Pagefind 索引构建产物 |
