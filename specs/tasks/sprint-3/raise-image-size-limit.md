# raise-image-size-limit: 图片上传上限放宽到 50MB

**Sprint**: Sprint 3
**序号**: 13
**状态**: completed
**类别**: API + FRONTEND
**架构层级**: 数据层 + 领域层 + 接口层 + 表现层（同一边界值，跨层）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [raise-image-size-limit](../../backlog/raise-image-size-limit.md)

## 意图声明

- **改动意图**: 单张图片上限 5 MiB → 50 MiB（52,428,800 B）：D1 迁移放宽 `images.size` 约束；服务端 `IMAGE_MAX_BYTES` 与 413 文案；请求体上限 16 MiB → 64 MiB（容纳 50MB 图片 + 10MB 视频）；前端 `validate-file` 上限与提示"图片不能超过 50MB"
- **影响范围**: `src/db/migrations/0002_raise_image_size_limit.sql`（新建）、`src/domains/media/validate.ts`、`src/pages/api/admin/images.ts`、`src/lib/upload/validate-file.ts`
- **不变量**: 视频上限 10MB 不变；已有 `images` 数据在迁移后保留，触发器与索引照旧；类型、魔数校验不变
- **不在本任务**: 浏览器端自动压缩（未采纳）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05 图片上传](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) AC3 · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/behaviors.md) BH-05 |
| 设计依据 | [nfr.md §2.2](../../product/nfr.md) · [media domain-model §4.3](../../engineering/backend/domains/media/domain-model.md) · [api-contract](../../engineering/backend/domains/media/api-contract.md) · [data-model](../../engineering/backend/domains/media/data-model.md) · [media-upload module-spec §3](../../engineering/frontend/modules/media-upload/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | MEDIA-UT-05（图片部分）：52,428,800 B 接受、52,428,801 B → `FILE_TOO_LARGE` | 单元 |
| 2 | [UT-86](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) / UT-92：前端 50MB−1、50MB 通过，50MB+1、60MB 提示"图片不能超过 50MB"且不上传 | 单元 |
| 3 | [TC-US05-08](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md) + 迁移：直调接口 50MB+1 / 60MB → 413"图片不能超过 50MB"；恰好 50MB 图片 + 10MB 视频 201 且 `images.size` = 52,428,800；请求体 > 64 MiB → 413 | 集成（workers） |
| 4 | TC-US05-06 + TC-US05-07：拖入恰好 50MB 上传成功、存储大小一致；50MB+1 拖入 / 60MB 粘贴前端拒绝 | E2E |

## DoD（完成定义）

### 实现类
- [x] `0002_raise_image_size_limit.sql` 重建 `images`（新表 → 复制 → 删旧表 → 改名 → 重建索引与触发器），本地迁移应用成功，已有行保留
- [x] 服务端、前端上限与文案为 50MB；请求体上限 64 MiB
- [x] DDL 记入 [`specs/deploy/ddl-changes.md`](../../deploy/ddl-changes.md)（线上部署前执行远程迁移）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`tests/unit/media/*`、`tests/unit/upload/*`、`tests/integration/media/*`、US-05 上传 E2E（`editor-image-drop`、`editor-image-errors`、`editor-image-paste`、`image-api`）通过；E2E 补跑 webkit 一次
- [x] `npm run lint` 与 `npm run check` 无错误

## 依赖

无

## 影响的文件

- `src/db/migrations/0002_raise_image_size_limit.sql`（新建）
- `src/domains/media/validate.ts`、`src/pages/api/admin/images.ts`、`src/lib/upload/validate-file.ts`
- `tests/unit/media/validate.test.ts`、`tests/unit/upload/validate-file.test.tsx`、`tests/integration/media/upload-endpoint.test.ts`、`tests/e2e/editor-image-drop.spec.ts`、`tests/e2e/editor-image-errors.spec.ts`

## 回滚策略

代码与测试回退到 5MB；迁移已应用的环境另写一个反向迁移（把超过 5MB 的行先处理掉再收紧约束），未应用的环境直接删除 0002

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [raise-image-size-limit](../../backlog/raise-image-size-limit.md) | 勾选验收、状态 → done |
| media data-model | 标注 0002 已实现 |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
