# add-heic-upload: 主色计算与"处理中"占位

> 文件名沿用原任务名（避免断链）。2026-10-15 去掉 HEIC / HEIF 解码（`heic-to`）与 heic / heif 输入，只保留主色与占位阶段（[drop-apple-live-photo](../../backlog/drop-apple-live-photo.md)）。

**Sprint**: Sprint 3
**序号**: 5
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/` + 编辑器）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 上传链路加入预处理阶段：占位先插入 `![处理中…]()`，所有图片解码为位图后用 `dominantColor` 计算主色，主色与宽高随请求上报（`rgb`、`width`、`height` 字段），开始上传后占位改为 `![上传中…]()`。完成后作者拖入任意图片，能先后看到"处理中…""上传中…"，插入的 key 带真实主色（不再是服务端缺省的 `808080`）。任务 6、7 的切视频 / 转码复用这个"处理中"阶段
- **影响范围**: `src/lib/upload/`（新增 `dominant-color.ts`、占位阶段状态机）、`use-image-uploads.ts`、`upload-client.ts`（`rgb`、`width`、`height` 字段）
- **不变量**: png / jpg / webp / gif 的占位、大小、类型、失败处理沿用 US-05（`tests/unit/upload/*`、US-05 E2E 保持通过）；`validate-file.ts` 可接受的类型不变（heic / heif 仍按"仅支持 png、jpg、webp、gif"拒绝）
- **不在本任务**: 视频处理与图片 + 视频上传（add-live-photo-pair-upload）；动态照片识别（add-motion-photo-detection）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC4；behaviors BH-05 |
| 设计依据 | [media-upload module-spec §1–§3](../../engineering/frontend/modules/media-upload/module-spec.md) · [ADR-006 第 4 点](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · [admin-post-editor"上传占位"](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-145](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) `dominantColor`：纯色、黑白各半避开极值、6 位小写 hex | 单元 |
| 2 | UT-146 占位阶段状态机：`processing` → `uploading` → 替换 / 移除 | 单元 |
| 3 | [TC-US11-22](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md)：拖入 `b.jpg`（`createImageBitmap` 延迟 1.5s）时"处理中…"→"上传中…"与预览占位块；请求带 `width`、`height`、`rgb`，key 主色与 `rgb` 一致 | E2E |

## DoD（完成定义）

### 实现类
- [x] 主色对所有图片计算（此前服务端缺省 `808080`）；宽高随请求上报，服务端仍以文件头为准
- [x] 占位块文案"图片处理中… 文件名"沿用 `upload-placeholder.ts`
- [x] 不引入 `heic-to`

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归（可做任务全部完成后统一跑；`upload-queue` 单元测试已随占位阶段更新）：`tests/unit/upload/*`、US-05 上传 E2E 通过；E2E 补跑 webkit 一次
- [ ] `npm run lint` 与 `npm run check` 无错误（统一跑；本任务 tsc、eslint 已过）

## 依赖

无（原依赖 [spike-browser-media-processing](spike-browser-media-processing.md) 是为 HEIC 解码，2026-10-15 起不再需要）

## 影响的文件

- `src/lib/upload/dominant-color.ts`（新建）、`use-image-uploads.ts`、`upload-client.ts`
- `tests/unit/upload/dominant-color.test.ts`、`placeholder-phase.test.ts`（新建）、`tests/e2e/live-photo-upload.spec.ts`（新建）

## 回滚策略

回退 `src/lib/upload/` 的预处理阶段，恢复为直接上传（主色回到服务端缺省 `808080`）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | `dominantColor`、占位阶段标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
