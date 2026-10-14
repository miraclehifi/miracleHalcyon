# implement-image-upload-api: 实现图片上传接口（单图）

**Sprint**: Sprint 2
**序号**: 2
**状态**: pending
**类别**: API
**架构层级**: 领域层 + 数据层 + 接口层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 新建 `media` 领域，实现 `POST /api/admin/images` 单图上传：按文件头魔数判定类型并解析宽高、校验大小与字段、生成自描述随机 key、写 R2 与 `images` 表，失败时回滚不留残余
- **影响范围**: `src/domains/media/`（新建）、`src/pages/api/admin/images.ts`（新建）；`images` 表已在 `0001_init.sql`
- **不变量**: middleware 的会话与 Origin 校验对新接口生效；已有接口测试不变
- **不在本任务**: `video` 字段与实况照片（MEDIA-UT-02、MEDIA-UT-06 视频部分）留到 Sprint 3 US-11

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05 图片上传](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/behaviors.md) |
| 设计依据 | [media domain-model §2–§6](../../engineering/backend/domains/media/domain-model.md) · [media api-contract](../../engineering/backend/domains/media/api-contract.md) · [media data-model](../../engineering/backend/domains/media/data-model.md) · [ADR-005](../../engineering/features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | MEDIA-UT-01 / 03 / 04 / 05：`sniffImage`、`buildImageKey`、字段校验、5 MiB 边界 | 单元 |
| 2 | [TC-US05-04](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md) + MEDIA-UT-07：gif 与 1×1 png 上传成功，key 中尺寸取服务端解析值 | 集成（workers） |
| 3 | TC-US05-08、TC-US05-16：6MB 直调接口 413、0 字节 400 | 集成 |
| 4 | TC-US05-14、TC-US05-15：HTML / SVG 改名 .png（含伪造 Content-Type）被拒 | 集成（安全） |
| 5 | TC-US05-17、TC-US05-18 + MEDIA-UT-06（D1 插入失败）：未登录 401、跨站 403、D1 失败时 R2 无残留 | 集成（安全） |

## DoD（完成定义）

### 实现类
- [ ] `src/domains/media/validate.ts`（`sniffImage`、大小与字段校验）、`key.ts`（`ImageId`、`buildImageKey`）、`repo.ts`（R2 `MediaStore`、D1 `ImageRepo`）、`service.ts`（`upload` 流程 §5 第 1–4、6 步）
- [ ] `POST /api/admin/images` 返回契约中的 201 体（`live: false`、`videoUrl: null`），错误码与契约一致
- [ ] 请求体 > 16 MiB 按 `Content-Length` 直接 413 `PAYLOAD_TOO_LARGE`

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`npm test` 全部通过
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

无

## 影响的文件

- `src/domains/media/validate.ts`、`key.ts`、`repo.ts`、`service.ts`（新建）
- `src/pages/api/admin/images.ts`（新建）
- `tests/unit/media/validate.test.ts`、`tests/integration/media/upload-endpoint.test.ts`（新建）、`tests/fixtures/images/`（新建）

## 回滚策略

回退新增文件（`images` 表结构不变，无迁移）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| media domain-model / api-contract | 标注"已实现（单图）" |
