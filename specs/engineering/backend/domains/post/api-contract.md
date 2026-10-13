# post API 契约

**最后更新**: 2026-10-13
**状态**: self-checked

> 通用约定（错误体、401/403、字段格式）见 [domains/_index.md](../_index.md) 与 [auth/api-contract.md](../auth/api-contract.md)"通用 401 / 403"。

---

## 1. 端点总览

| 方法 | 路径 | 认证 | 领域服务 | US |
|------|------|------|---------|----|
| GET | `/api/admin/posts` | 会话 | `list` | US-07 |
| POST | `/api/admin/posts` | 会话 | `create` | US-03、US-06 |
| GET | `/api/admin/posts/:id` | 会话 | `getForEdit` | US-03、US-06 |
| PUT | `/api/admin/posts/:id` | 会话 | `saveDraft` | US-03、US-06 |
| DELETE | `/api/admin/posts/:id` | 会话 | `delete` | US-09 |
| POST | `/api/admin/posts/:id/publish` | 会话 | `publish`（发布与发布更新共用） | US-08 |
| POST | `/api/admin/posts/:id/unpublish` | 会话 | `unpublish` | US-08 |
| GET | `/api/admin/tags?q=` | 会话 | `suggestTags` | US-03 |
| GET | `/api/posts` | 公开 | `listPublished` | US-08（读者可见性）、F-002 |
| GET | `/api/posts/:slug` | 公开 | `getPublishedBySlug` | US-08、US-09、F-002 |

> 验收用例 US-08 中暂记的 `POST /api/admin/posts/:id/update` 不单独提供：发布更新同样调用 `/publish`。

## 2. 数据对象

### PostView（后台文章对象）

```json
{
  "id": "42",
  "title": "Hello Astro",
  "slug": "hello-astro",
  "tags": ["Astro", "Cloudflare"],
  "summary": "Astro 5 入门笔记",
  "body": "# Hello\n\n正文第一段。",
  "publishedAt": "2026-10-10",
  "status": "published",
  "hasUnpublishedChanges": true,
  "lastPublishedAt": "2026-10-12T08:00:00.000Z",
  "createdAt": "2026-10-10T02:00:00.000Z",
  "updatedAt": "2026-10-13T06:30:00.000Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 文章 ID |
| `title` / `slug` / `tags` / `summary` / `body` / `publishedAt` | — | **工作稿**内容（编辑页显示的是最新保存内容，含未发布修改）；`slug` 可为 `""`，`publishedAt` 可为 `null` |
| `status` | `draft` \| `published` | — |
| `hasUnpublishedChanges` | boolean | 草稿恒为 false |
| `lastPublishedAt` | 时间戳 \| null | — |
| `createdAt` / `updatedAt` | 时间戳 | `updatedAt` 即"已保存 · HH:mm"的时间 |

### PostListItem

`{ id, title, status, hasUnpublishedChanges, tags, updatedAt }`（不含正文）

### PublishedPost（公开）

`{ slug, title, summary, tags, publishedAt, body, lastPublishedAt }`，全部取自**已发布快照**。`PublishedPostSummary` 同上但不含 `body`。

## 3. 后台端点

### GET /api/admin/posts

| 查询参数 | 规则 |
|---------|------|
| `status` | `all`（默认）/ `draft` / `published`；其他值 → 400 `VALIDATION_FAILED` |
| `q` | 可选，≤ 100 字符 |
| `page` | 正整数，默认 1；非法 → 400 |

**200**
```json
{ "items": [PostListItem], "page": 1, "pageSize": 20, "total": 23,
  "counts": { "all": 23, "draft": 5, "published": 18 } }
```
口径见 [domain-model.md](domain-model.md) §6。

### POST /api/admin/posts

**请求**：`DraftInput`（全部可选，缺省按空值处理）

```json
{ "title": "", "slug": "", "tags": [], "summary": "", "body": "正文", "publishedAt": "2026-10-13" }
```

| 状态 | 体 |
|------|----|
| 201 | `PostView`（`Location: /api/admin/posts/{id}`） |
| 400 | `VALIDATION_FAILED`（`error.fields`: 出错字段数组，如 `["summary"]`） |
| 409 | `SLUG_TAKEN`："slug 已存在，请换一个" |

### GET /api/admin/posts/:id

| 状态 | 体 |
|------|----|
| 200 | `PostView` |
| 404 | `POST_NOT_FOUND`："文章不存在或已被删除" |

### PUT /api/admin/posts/:id

自动保存。请求体为完整 `DraftInput`（六个字段都必须出现，缺字段 → 400，防止部分覆盖丢数据）。请求体中的 `status`、`id`、`hasUnpublishedChanges` 等字段一律忽略（不能通过保存改变发布状态，US-06 约束）。

| 状态 | 体 |
|------|----|
| 200 | `PostView` |
| 400 | `VALIDATION_FAILED` + `fields` |
| 404 | `POST_NOT_FOUND` |
| 409 | `SLUG_TAKEN`（整份不保存） |
| 413 | `PAYLOAD_TOO_LARGE`（请求体 > 1MB） |

### DELETE /api/admin/posts/:id

| 状态 | 体 |
|------|----|
| 204 | — |
| 404 | `POST_NOT_FOUND`（不删除任何数据） |

前端列表的延迟删除使用 `fetch(url, { method: 'DELETE', keepalive: true })`。

### POST /api/admin/posts/:id/publish

无请求体。发布草稿或发布更新。

| 状态 | 体 | 说明 |
|------|----|------|
| 200 | `PostView` | `status = published`、`hasUnpublishedChanges = false` |
| 404 | `POST_NOT_FOUND` | — |
| 409 | `SLUG_TAKEN` | — |
| 422 | `MISSING_FIELDS`："发布前请填写：标题、slug、正文"，`error.fields`: `["title","slug","body"]` 的子集（按此顺序） | 文章不变 |

已发布且无修改时再次调用 → 200，返回当前状态（幂等）。

### POST /api/admin/posts/:id/unpublish

| 状态 | 体 |
|------|----|
| 200 | `PostView`（`status = draft`） |
| 404 | `POST_NOT_FOUND` |
| 409 | `NOT_PUBLISHED`："文章还没有发布" |

### GET /api/admin/tags?q=

返回所有文章（工作稿 + 快照）中出现过的标签，按不区分大小写的包含匹配过滤，按使用次数降序、名称升序，最多 10 个。`q` 为空时返回最常用的 10 个。

**200** `{ "tags": [{ "name": "Astro", "count": 5 }] }`

## 4. 公开端点（读者只读）

响应头 `Cache-Control: no-store`。读者页构建时预渲染，这两个端点主要供构建脚本读取已发布文章（`body` 为 Markdown 原文，端点不渲染）。

### GET /api/posts?page=&tag=

**200** `{ "items": [PublishedPostSummary], "page": 1, "pageSize": 20, "total": 18 }`；按 `publishedAt DESC, lastPublishedAt DESC` 排序。

### GET /api/posts/:slug

| 状态 | 体 |
|------|----|
| 200 | `PublishedPost` |
| 404 | `POST_NOT_FOUND`（草稿、已撤回、已删除、slug 大小写不符都返回 404） |

## 5. 错误码汇总

| code | HTTP | message |
|------|------|---------|
| `VALIDATION_FAILED` | 400 | 按字段给出，如"摘要不能超过 200 字" |
| `POST_NOT_FOUND` | 404 | 文章不存在或已被删除 |
| `SLUG_TAKEN` | 409 | slug 已存在，请换一个 |
| `NOT_PUBLISHED` | 409 | 文章还没有发布 |
| `PAYLOAD_TOO_LARGE` | 413 | 内容过大 |
| `MISSING_FIELDS` | 422 | 发布前请填写：{缺失项} |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-13 | 1.1 | 公开端点说明改为供构建时预渲染读取（ADR-001 修订） | miraclehifi |
