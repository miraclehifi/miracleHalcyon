# add-live-photo-pair-upload: 同名配对上传实况照片

**Sprint**: Sprint 3
**序号**: 6
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/` + 编辑器）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: `pairFiles` 把一批文件（粘贴 / 拖入 / "插入图片"多选）按 basename（不区分大小写）配对并保持顺序；配对项经 `processVideo`（`mediabunny` 动态 import，支持 avc1 则转码 H.264 去音轨，否则只转封装并返回 `HEVC_KEPT`，> 10MB 返回 `dropVideo`）后与图片在同一请求上传，引用追加 `#live`。只有视频 → 不上传、`Toast/Error`；视频丢弃 / 保留 HEVC → `Toast/Warning`（常驻）；任一失败 → 移除占位、不留半对
- **影响范围**: `src/lib/upload/`（新增 `pair-files.ts`、`process-video.ts`、`uploadItem`）、`validate-file.ts`（接受 mov / mp4）、`use-image-uploads.ts`、`upload-client.ts`（`video` 字段）、拖放提示文案"松开以上传图片或实况照片"
- **不变量**: 单图与 HEIC 路径不变；占位按出现顺序定位，乱序完成仍保持顺序
- **不在本任务**: 安卓 Motion Photo（add-motion-photo-detection）；预览播放（add-live-photo-playback）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC1、AC5–AC8；behaviors BH-01、BH-04、BH-06 – BH-09、BH-12 |
| 设计依据 | [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) · [ADR-006 第 1、3、5 点](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · [admin-post-editor"实况照片错误 / 降级"](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-141](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) `pairFiles` + UT-144 `processVideo` 三个分支 | 单元 |
| 2 | [TC-US11-01](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md) + TC-US11-17：拖入 / "插入图片"多选同名 HEIC + MOV，只插入一条 `#live` 引用 | E2E |
| 3 | TC-US11-07 + TC-US11-08：混合批次按顺序插入、只有配对项带 `#live`；文件名大小写不同仍配对 | E2E |
| 4 | TC-US11-09 + TC-US11-10 + TC-US11-16：12MB 退回普通图片并警示；10MB 边界；不支持 H.264 时保留 HEVC 并警示 | E2E |
| 5 | TC-US11-12 + TC-US11-14：只拖入视频不上传并报错；上传失败图片与视频都不保留 | E2E |

## DoD（完成定义）

### 实现类
- [ ] `mediabunny` 只在遇到视频时动态 import
- [ ] 警示与错误文案、带文件名规则与页面规格一致
- [ ] TC-US11-21（性能 < 15s）在 Sprint 末 verify 时跑

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`tests/unit/upload/*`、US-05 上传 E2E、add-heic-upload 的 E2E 通过；E2E 补跑 webkit 一次
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[spike-browser-media-processing](spike-browser-media-processing.md)、[implement-live-photo-upload-api](implement-live-photo-upload-api.md)、[add-heic-upload](add-heic-upload.md)

## 影响的文件

- `src/lib/upload/pair-files.ts`、`process-video.ts`（新建）、`validate-file.ts`、`use-image-uploads.ts`、`upload-client.ts`
- `src/components/admin/editor/MarkdownEditor.tsx`（拖放提示文案）
- `tests/unit/upload/pair-files.test.ts`、`process-video.test.ts`（新建）、`tests/e2e/live-photo-upload.spec.ts`

## 回滚策略

回退配对与视频处理；视频文件恢复为"仅支持 png、jpg、webp、gif"

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | `pairFiles`、`processVideo`、`uploadItem` 标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
