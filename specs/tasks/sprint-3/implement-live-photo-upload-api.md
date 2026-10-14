# implement-live-photo-upload-api: 上传接口支持实况视频

**Sprint**: Sprint 3
**序号**: 3
**状态**: completed
**类别**: API
**架构层级**: 领域层 + 数据层 + 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: `POST /api/admin/images` 接受可选 `video` 字段：`sniffVideo`（`ftyp` brand 白名单）、视频 ≤ 10 MiB、只有视频 / `file` 是视频的拒绝；按 domain-model §5 第 5、6 步写入 `.live.mp4` 并在失败时回滚，保证不留半对；201 返回 `live: true` 与 `videoUrl`
- **影响范围**: `src/domains/media/validate.ts`（`sniffVideo`、视频大小）、`service.ts`（`upload` 第 5、6 步）、`repo.ts`（写 `video_key` / `video_size`，两列已在 `0001_init.sql`，无迁移）、`src/pages/api/admin/images.ts`
- **不变量**: 单图上传行为与响应不变（`tests/integration/media/upload-endpoint.test.ts` 保持通过）；`/img/*.live.mp4` 读取与 Range 已在 Sprint 2 实现，不改
- **不在本任务**: 浏览器端配对与视频处理（add-live-photo-pair-upload）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC1、AC5、AC6、AC7 |
| 设计依据 | [media domain-model §2、§4.2、§4.3、§5](../../engineering/backend/domains/media/domain-model.md) · [media api-contract](../../engineering/backend/domains/media/api-contract.md) · [media data-model](../../engineering/backend/domains/media/data-model.md) · [ADR-006 第 5 点](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | MEDIA-UT-02 `sniffVideo` + MEDIA-UT-05 视频大小边界（10,485,760 接受 / +1 `VIDEO_TOO_LARGE`） | 单元 |
| 2 | [TC-US11-02](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md)：图 + 视频上传 201，R2 中有 jpg 与同名 `.live.mp4`，`live: true`、`videoUrl` 正确 | 集成（workers） |
| 3 | TC-US11-11 + TC-US11-13：直调接口 > 10MB 视频 413；只有 `video` 400 `VALIDATION_FAILED`；`file` 为视频 400 `UNSUPPORTED_TYPE` | 集成 |
| 4 | TC-US11-15 + MEDIA-UT-06（视频部分）：视频 `put` 失败回滚图片；D1 插入失败删除图片与视频；R2 与 D1 均无残留 | 集成 |
| 5 | TC-US11-19 + TC-US11-20：伪造视频魔数（`fake.mp4`、`qt  ` MOV、HEIC）被拒；未登录 401、跨站 403；伪造宽高 / 主色被校验 | 集成（安全） |

## DoD（完成定义）

### 实现类
- [x] `sniffVideo` 按 domain-model §4.2 白名单判定，不解析编码
- [x] `upload` 第 5、6 步与回滚按 domain-model §5；视频 `contentType: video/mp4`、长缓存
- [x] 错误码与 api-contract 一致

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`tests/unit/media/*`、`tests/integration/media/*` 通过；E2E `image-api`、`editor-image-paste`（chromium）通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- `validate.ts`：`sniffVideo`（偏移 4 为 `ftyp`，major brand 在白名单；不足 12 字节为 false）、`checkVideoSize`（0 字节 → `VALIDATION_FAILED` `["video"]`，> 10 MiB → `VIDEO_TOO_LARGE`）；`errors.ts` 新增 `VideoTooLargeError`；`key.ts` 新增 `videoKeyFor`
- `service.ts`：先做全部校验（字段、图片大小、视频大小、图片魔数、视频魔数），再生成 key；写 R2 按图片、视频顺序，任何一步（含 D1 插入）失败都删除本次已写的对象后报 `UPLOAD_FAILED`；回滚用 `allSettled`，删除失败不掩盖原错误
- `repo.ts`：插入 `video_key` / `video_size`（列已在 `0001_init.sql`，`CHECK` 约束两者同为空或同不为空）
- 接口：`video` 不是文件 → 400 `["video"]`；只有 `video` → 沿用缺少 `file` 的 400；新增可注入的 `store`（测试用视频写入失败的仓储）
- 带视频的未登录 / 跨站请求由 middleware 拦截（按路径，与单图相同），测试经 `createAuthMiddleware` 验证

## 依赖

无（Sprint 2 的单图上传已完成）

## 影响的文件

- `src/domains/media/validate.ts`、`service.ts`、`repo.ts`
- `src/pages/api/admin/images.ts`
- `tests/unit/media/validate.test.ts`、`tests/integration/media/upload-endpoint.test.ts`、`tests/fixtures/live/`（`fake.mp4` 等小夹具）

## 回滚策略

回退上述文件的视频分支；单图路径不受影响（无迁移）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| media domain-model / api-contract | 标注"已实现（含实况视频）" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
