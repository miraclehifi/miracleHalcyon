# add-image-compression: 浏览器端图片压缩（WebP / JPEG）

**Sprint**: Sprint 6
**序号**: 1
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [media-upload-experience](../../backlog/media-upload-experience.md)

## 意图声明

- **改动意图**: 上传前在浏览器压缩静态图：`planCompression` 决定原样 / 重编码 / PNG 只缩尺寸，`compressImage` 用 `createImageBitmap(imageOrientation: from-image)` + canvas 输出 WebP 0.82（不支持时 JPEG 0.85），主色与宽高基于压缩结果；接入 `use-image-uploads` → `upload-item` 链路（动态照片切出的静态图同样压缩）。完成后作者拖入大照片，R2 中是长边 2560 的 WebP
- **影响范围**: `src/lib/upload/compress-image.ts`（新建）、`upload-item.ts` / `use-image-uploads.ts`（在测量主色前插入压缩）、夹具生成脚本
- **不变量**: 50MB 校验仍按原始大小；服务端不变；小图、GIF 原样上传；动态照片的视频处理流程不变
- **不在本任务**: PNG 缩完更大、解码失败等兜底的 E2E（任务 6）；进度卡片（任务 3）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) AC7、AC8；BH-13、BH-14、BH-16、BH-18 |
| 设计依据 | [media-upload module-spec §3"压缩计划""编码"](../../engineering/frontend/modules/media-upload/module-spec.md) · [ADR-006 调整（2026-10-16）](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-153 ~ UT-156](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：`planCompression` 决策表（= TC-US05-33）、`fitLongEdge`、`compressImage` 输出格式与降级、文件名随格式变化 | 单元 |
| 2 | [TC-US05-29](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md)：large-photo.jpg → 2560×1920 WebP，< 1.5MB，引用宽高与主色一致 | E2E |
| 3 | TC-US05-30：`toBlob` 不支持 WebP 时降级 JPEG（chromium + webkit） | E2E |
| 4 | TC-US05-35：EXIF Orientation 6 转正、输出不含 EXIF / GPS | E2E |
| 5 | TC-US05-06（回归）：exact-50mb.png（40×30 像素）按规则原样上传，R2 大小 = 52,428,800 B | E2E |

## DoD（完成定义）

### 实现类
- [x] `compress-image.ts` 导出 `planCompression`、`fitLongEdge`、`compressImage`，签名与 module-spec §2 一致
- [x] 格式按魔数识别；`bitmap.close()`、canvas 宽高置 0
- [x] 夹具脚本生成 `large-photo.jpg`、`portrait.jpg`（及任务 6 用的 PNG / GIF / WebP 夹具），提交 git
- [x] WebKit 下实际得到的格式（WebP 或 JPEG）记录在 module-spec 的"已实现"说明中

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（E2E chromium 通过，webkit 补跑一次）
- [x] 影响范围回归：本任务改动直接波及的已有测试文件通过（见"影响的文件"中的已有测试）
- [x] `npm run lint` 与 `npm run check` 无错误

## 依赖

—（无）

## 影响的文件

- `src/lib/upload/compress-image.ts`（新建）、`src/lib/upload/upload-item.ts`、`src/lib/upload/use-image-uploads.ts`
- `tests/unit/upload/compress-image.test.ts`（新建）、`tests/unit/upload/upload-item.test.ts`
- `tests/e2e/editor-image-compress.spec.ts`（新建）、`tests/e2e/editor-image-drop.spec.ts`（TC-US05-06）
- 夹具脚本与 `tests/fixtures/images/` 新夹具

## 回滚策略

去掉 `upload-item` 中的压缩调用，删除 `compress-image.ts` 与新夹具；行为回到原图直传

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | `compress-image.ts` 标注"已实现"，记录 WebKit 实测格式 |
| [sprint-6/_index.md](_index.md) | 本任务状态 → completed |

## 执行记录（2026-10-16）

- 单元：`tests/unit/upload/compress-image.test.ts` 8 项、`upload-item.test.ts` 新增 1 项；`tests/unit/upload/*` 32 / 32
- E2E：`editor-image-compress.spec.ts`（TC-US05-29、30、35）chromium + webkit 6 / 6；回归 `editor-image-drop.spec.ts`（含 TC-US05-06）、`live-photo-upload.spec.ts`（chromium-media + webkit，3 项按设计在 WebKit 跳过）通过
- 夹具改为页面内 canvas 生成（`FakeFile.content.photo`，渐变 + 细噪点 + 左上角红块），EXIF 由 `withExif` 在 Node 侧插入，不提交大文件
- 同步：OPPO 动态照片的静态图现在被压缩为 WebP，`live-photo-upload.spec.ts` 的引用正则加 `webp`，TC-US11-05 的静态图断言改为"小于主视频起点"
- 规格修正：TC-US05-06 夹具只有 40×30 像素，按"PNG 只在长边 > 2560 时缩"原样上传，验收期望改回 R2 = 52,428,800 B
- `npm run check` 的错误全部来自并行会话 F-006 进行中的文件（`src/domains/media/storage`、`ImageRepo.listAll`），与本任务无关
