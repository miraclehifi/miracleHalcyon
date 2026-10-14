# add-image-read-route: 实现图片读取路由

**Sprint**: Sprint 2
**序号**: 3
**状态**: completed
**类别**: API
**架构层级**: 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: `GET /img/{yyyy}/{mm}/{file}` 公开读取 R2 对象：长缓存、ETag / 304、Range 206；key 不匹配正则直接 404（不访问 R2）；带 `nosniff` 与 `CSP default-src 'none'`
- **影响范围**: `src/pages/img/[...key].ts`（新建）、`src/domains/media/service.ts`（`read`）；middleware 对 `/img/*` 放行
- **不变量**: `/admin/**`、`/api/admin/**` 的保护不变

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05 图片上传](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) |
| 设计依据 | [media api-contract `GET /img/*`](../../engineering/backend/domains/media/api-contract.md) · [media domain-model §3](../../engineering/backend/domains/media/domain-model.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | MEDIA-UT-08：存在 200 + 长缓存头；不存在 404；`..` 路径 404；`Range: bytes=0-99` 206 | 集成（workers） |
| 2 | [TC-US05-19](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md)：同名同内容上传两次得到不同 key，均可读取 | 集成（安全） |
| 3 | TC-US05-20：路径穿越 / Unicode 文件名不影响 key，读取路由拒绝非法 key | 集成（安全） |

## DoD（完成定义）

### 实现类
- [x] `src/pages/img/[...key].ts` 按契约返回 200 / 304 / 206 / 404
- [x] 响应头含 `Cache-Control: public, max-age=31536000, immutable`、`ETag`、`X-Content-Type-Options: nosniff`、`Content-Security-Policy: default-src 'none'`

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`npm test` 全部通过（含 middleware 测试）
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- `src/pages/img/[...key].ts`：`IMAGE_KEY` 正则不匹配直接 404（不访问 R2，含 `..`、大写 id、svg、非 img 目录）；`bucket.get(key, { onlyIf: request.headers, range: request.headers })` 由 R2 解析 `If-None-Match` 与 `Range`；无 body → 304；请求带 Range → 206 + `Content-Range`
- 响应头：`Cache-Control`（与写入时同一常量 `IMMUTABLE_CACHE`）、`ETag`、`Accept-Ranges`、`X-Content-Type-Options: nosniff`、`Content-Security-Policy: default-src 'none'`
- middleware 只处理 `/admin`、`/api/admin`，`/img/*` 天然公开，无需改动
- 补 `tests/e2e/image-api.spec.ts`：经真实 Astro + workerd 上传后读取，确认路由参数解析正确

## 依赖

[implement-image-upload-api](implement-image-upload-api.md)

## 影响的文件

- `src/pages/img/[...key].ts`（新建）、`src/domains/media/service.ts`、`src/middleware.ts`（如需放行）
- `tests/integration/media/read-route.test.ts`（新建）

## 回滚策略

回退新增路由与 middleware 放行改动

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| media api-contract `GET /img/*` | 标注"已实现" |
