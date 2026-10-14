# F-001 文章写作 — US → Domain 映射

**最后更新**: 2026-10-14

> 反向映射见各 domain-model.md"服务的需求"一节；两者必须一致。

| US | auth | post | media | markdown | editor | media-upload | 主要接口 |
|----|:----:|:----:|:-----:|:--------:|:------:|:------------:|---------|
| US-01 admin-login | ● | | | | | | `POST /api/admin/login`、middleware（已实现，Sprint 1） |
| US-02 admin-logout | ● | | | | | | `POST /api/admin/logout` |
| US-03 edit-post-info | ○ | ● | | | ● | | `POST/GET/PUT /api/admin/posts[/:id]`、`GET /api/admin/tags`、`slugify` |
| US-04 markdown-preview | | | | ● | ● | | `renderMarkdown`（Web Worker）、同步滚动 |
| US-05 image-upload | ○ | | ● | ○ | ● | ● | `POST /api/admin/images`、`GET /img/*`（已实现，Sprint 2） |
| US-06 autosave-draft | ○ | ● | | | ● | | `POST/PUT /api/admin/posts`、自动保存状态机、本地暂存 |
| US-07 post-list | ○ | ● | | | | | `GET /api/admin/posts`（已实现，Sprint 1；列表页 `/admin` 已实现） |
| US-08 publish-post | ○ | ● | | | ● | | `POST /api/admin/posts/:id/publish`、`/unpublish`、`GET /api/posts[/:slug]` |
| US-09 delete-post | ○ | ● | | | | | `DELETE /api/admin/posts/:id`（已实现，Sprint 2：列表左滑 + 撤销、写文章页删除） |
| US-10 format-toolbar | | | | | ● | | `applyFormat`、`applyEdit` |
| US-11 live-photo-upload | ○ | | ● | ○ | ● | ● | `POST /api/admin/images`（`video`）、`GET /img/*.live.mp4` |
| US-12 image-layout-marks | | | ○ | ● | ● | | 图片插件、`ImageMenu`、`toggleMark`、`setGalleryMode` |

● 主要承载　○ 依赖（auth 的 ○ = 受 middleware 保护）

## Domain → 文档

| 模块 | 文档 |
|------|------|
| auth | [domain-model](../../backend/domains/auth/domain-model.md) · [api](../../backend/domains/auth/api-contract.md) · [data](../../backend/domains/auth/data-model.md) |
| post | [domain-model](../../backend/domains/post/domain-model.md) · [api](../../backend/domains/post/api-contract.md) · [data](../../backend/domains/post/data-model.md) |
| media | [domain-model](../../backend/domains/media/domain-model.md) · [api](../../backend/domains/media/api-contract.md) · [data](../../backend/domains/media/data-model.md) |
| markdown | [module-spec](../../frontend/modules/markdown/module-spec.md) |
| editor | [module-spec](../../frontend/modules/editor/module-spec.md) |
| media-upload | [module-spec](../../frontend/modules/media-upload/module-spec.md) |
