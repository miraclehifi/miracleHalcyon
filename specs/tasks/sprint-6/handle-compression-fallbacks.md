# handle-compression-fallbacks: 压缩兜底与原样上传

**Sprint**: Sprint 6
**序号**: 6
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [media-upload-experience](../../backlog/media-upload-experience.md)

## 意图声明

- **改动意图**: 验证并补齐压缩的边界：PNG 只缩尺寸、缩完不比原图小时用原图；GIF 与小图原样上传（字节一致）；压缩不划算、解码失败、canvas 分配失败都退回原图，写作流程不中断
- **影响范围**: `compress-image.ts` 兜底分支、对应夹具
- **不变量**: 任务 1 的正常压缩结果不变
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) AC8；BH-15、BH-16、BH-17 |
| 设计依据 | [media-upload module-spec §3"压缩计划""编码"](../../engineering/frontend/modules/media-upload/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US05-31](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md)：PNG 缩到 2560×1440 仍为 PNG 带 alpha；缩完更大时用原图 | E2E |
| 2 | TC-US05-32：GIF（多帧）、小图、200KB 截图字节与原文件一致 | E2E |
| 3 | TC-US05-34：noisy.webp、broken.jpg、canvas 分配失败均用原图上传，无错误提示 | E2E |

## DoD（完成定义）

### 实现类
- [x] `flat-3000x1000.png`、`noisy.webp` 夹具生成时校验"重编码不比原图小"的前提成立

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（E2E chromium 通过，webkit 补跑一次）
- [x] 影响范围回归：本任务改动直接波及的已有测试文件通过（见"影响的文件"中的已有测试）
- [x] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-image-compression](add-image-compression.md)

## 影响的文件

- `src/lib/upload/compress-image.ts`
- `tests/e2e/editor-image-compress.spec.ts`、`tests/unit/upload/compress-image.test.ts`
- 夹具脚本与 `tests/fixtures/images/`

## 回滚策略

回退本任务对 `compress-image.ts` 兜底分支的修改

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | 兜底规则标注"已实现" |
| [sprint-6/_index.md](_index.md) | 本任务状态 → completed |
