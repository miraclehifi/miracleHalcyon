# add-live-photo-pair-upload: 实况视频处理与图片 + 视频上传

> 文件名沿用原任务名（避免断链）。2026-10-15 去掉 `pairFiles` 同名配对、mov / mp4 文件输入与只拖视频的报错，只保留视频处理与成对上传（[drop-apple-live-photo](../../backlog/drop-apple-live-photo.md)）。

**Sprint**: Sprint 3
**序号**: 6
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: `processVideo`（`mediabunny` 动态 import）：支持 avc1 编码则转码 H.264（长边 1920、6 Mbps、去音轨）；不支持或源编码无法解码时只转封装并返回 `HEVC_KEPT`；源已是无音轨的 H.264 mp4 原样使用；结果 > 10MB 返回 `dropVideo`。`uploadItem` 处理 `{ kind: 'live' }` 项：静态图与视频在同一请求上传（`upload-client` 的 `video` 字段），引用追加 `#live`；丢弃视频 / 保留 HEVC → `Toast/Warning`（常驻）；任一步失败 → 移除占位、`Toast/Error`，不留半对
- **影响范围**: `src/lib/upload/`（新增 `process-video.ts`、`uploadItem` 的 `live` 分支）、`use-image-uploads.ts`、`upload-client.ts`（`video` 字段）
- **不变量**: 单图路径、占位阶段（add-heic-upload）不变；`validate-file.ts` 可接受的类型不变（不接受 mov / mp4）；拖放提示文案保持"松开以上传图片"
- **不在本任务**: 动态照片识别与端到端入口（add-motion-photo-detection）；预览播放（add-live-photo-playback）
- **演示方式**: 本任务没有面向作者的入口（`live` 项只由任务 7 的动态照片识别产生），以单元 / 组件测试 + 开发页手动演示：`/_spike/media`（仅 dev）对 OPPO 样本 `tests/fixtures/live/IMG20260516172228.jpg` 切出的视频跑正式 `processVideo`，看到转码 / 只转封装 / 丢弃三种结果。降级与失败的 E2E 由任务 7 的入口驱动，放在任务 7 的测试清单

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC5、AC7、AC8；behaviors BH-06、BH-08、BH-09 |
| 设计依据 | [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) · [ADR-006 第 3、5 点](../../engineering/features/F-001-文章写作/architecture/adr/ADR-006-live-photo-browser-processing.md) · [admin-post-editor"实况照片错误 / 降级"](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-144](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) `processVideo`：转码 / 只转封装 + `HEVC_KEPT` / H.264 原样使用 / 10,485,760 B 保留、+1 `dropVideo` | 单元 |
| 2 | UT-152 `uploadItem` 实况项：`file` + `video` 同一请求并追加 `#live`；`dropVideo` 不带视频并警示；`HEVC_KEPT` 警示；上传失败移除占位并报错 | 单元 |

## DoD（完成定义）

### 实现类
- [ ] `mediabunny` 只在处理视频时动态 import
- [ ] 警示与错误文案、带文件名规则与页面规格一致
- [ ] `/_spike/media` 可手动跑正式 `processVideo`（仅 dev）

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`tests/unit/upload/*`、US-05 上传 E2E、add-heic-upload 的 E2E 通过
- [ ] 构建产物检查（自 spike 移入）：`npm run build` 后 `mediabunny` 只出现在后台 chunk，不在读者页与 `_worker.js` 中
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[spike-browser-media-processing](spike-browser-media-processing.md)、[implement-live-photo-upload-api](implement-live-photo-upload-api.md)、[add-heic-upload](add-heic-upload.md)（占位阶段与主色）

## 影响的文件

- `src/lib/upload/process-video.ts`（新建）、`uploadItem` 所在文件、`use-image-uploads.ts`、`upload-client.ts`
- `src/pages/admin/_spike-media.astro`（dev 演示接入正式 `processVideo`）
- `tests/unit/upload/process-video.test.ts`、`upload-item.test.ts`（新建）

## 回滚策略

回退视频处理与 `live` 分支；`upload-client` 不再发送 `video` 字段

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | `processVideo`、`uploadItem` 标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
