# 图片上传上限从 5MB 放宽到 50MB

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Enhancement |
| 优先级 | P1-High |
| 来源 | 作者需求（手动测试图片上传时提出） |
| 日期 | 2026-10-14 |
| 创建者 | miraclehifi |

## 描述

手机直出的 JPEG 常在 5MB 以上（高像素模式 8–15MB），现在会被直接拒绝，只能先压缩再上传。作者决定把单张图片上限放宽到 50MB（50 MiB = 52,428,800 B；先定为 20MB，手动测试时改为 50MB），不做浏览器端自动压缩。实况视频上限（10MB）不变。

## 目标与验收

**目标**: 50MB 以内的 png / jpg / webp / gif 都能直接上传，前端提示、服务端校验、数据库约束三处一致。

**验收条件**:
- [x] 恰好 52,428,800 B 的图片上传成功；多 1 B 前端提示"图片不能超过 50MB"、不上传；绕过前端直调接口返回 413 `FILE_TOO_LARGE`
- [x] 50MB 图片 + 10MB 实况视频在同一请求中可上传（请求体上限随之放宽）
- [x] `images` 表的 `size` 约束放宽到 52,428,800，已有数据保留
- [x] NFR、US-05、API 契约、领域模型、数据模型、media-upload 模块规格与测试规格同步

## 影响分析

- **规格**: [nfr.md](../product/nfr.md) §2.2；US-05 story / behaviors（AC3、BH-05 文案与边界）；US-05 验收用例 TC-US05-06 / 07 / 08、单元规格 UT-86；media domain-model §4.3、api-contract（`file` 上限、413 文案）、data-model（`size` CHECK）；media-upload module-spec §3（前端大小检查、HEIC 降质量重试阈值）
- **代码**: `src/domains/media/validate.ts`、`src/pages/api/admin/images.ts`（413 文案、请求体上限 16 MiB → 64 MiB）、`src/lib/upload/validate-file.ts`；对应单元、集成、E2E 测试
- **数据库（DDL）**: 新增迁移 `0002_raise_image_size_limit.sql`。SQLite 不能修改 CHECK 约束，需重建 `images` 表（建新表 → 复制数据 → 删旧表 → 改名 → 重建索引）。线上 D1 需在部署前应用迁移，记入 [`specs/deploy/ddl-changes.md`](../deploy/ddl-changes.md)
- **平台限制**: Workers 请求体上限（Free / Pro 100MB）可容纳 64 MiB 请求；**内存上限 128MB 是风险**：当前实现在表单解析与读取字节时各持有一份数据，50MB 图片 + 10MB 视频峰值可能接近或超过上限，本地 miniflare 不限内存测不出。上线前需评估（例如改为流式写入 R2）
- **读者端**: 图片原样提供、无服务端压缩，大图会让读者加载变慢；作者接受（自行控制图片大小）
- **不变**: F-001 成功指标"5MB 以内图片 < 5s"是性能指标，不随上限修改

## 路由

SDD-Lite：只改 US-05 的一个边界值，复用 media 领域，无新领域、无架构变更。排入 Sprint 3（活跃 Sprint）任务 [raise-image-size-limit](../tasks/sprint-3/raise-image-size-limit.md)。

## 估算

- **规模**: S

## 完成记录

2026-10-14 完成（Sprint 3 任务 [raise-image-size-limit](../tasks/sprint-3/raise-image-size-limit.md)）。知识去向：上限值写入 nfr §2.2、media 领域规格与 US-05；DDL 记入 [ddl-changes](../deploy/ddl-changes.md)（⏳ 线上待执行，须先于代码部署）。

**遗留**：Workers 128MB 内存风险未处理（本地 miniflare 不限内存，测不出）。上线后若大图上传报 500 / 超内存，另开条目改为流式写入 R2。
