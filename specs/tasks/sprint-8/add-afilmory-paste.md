# add-afilmory-paste: 粘贴 Afilmory 分享代码 / 链接

**Sprint**: Sprint 8
**序号**: 4
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/afilmory/`、`src/lib/upload/`、编辑器组件）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [afilmory-photo-embed](../../backlog/afilmory-photo-embed.md)

## 意图声明

- **改动意图**: 新建 `src/lib/afilmory/paste.ts`（`parseAfilmoryPaste`）、`markdown.ts`（`afilmoryMarkdown`）、`client.ts`（`fetchAfilmoryPhoto` 调接口）；`useImageUploads` 任务来源扩展为文件或 Afilmory id，新增 `insertAfilmoryPhotos(ids, at?)` 与 `fetching` 阶段；`UploadCard` 显示"正在获取照片信息…"；`MarkdownEditor.onBodyPaste` 识别文本
- **影响范围**: `use-image-uploads.ts`（任务结构）、`UploadCard.tsx`、`MarkdownEditor.tsx`、`progress.ts`（如需 fetching 进度）
- **不变量**: 文件上传全部行为不变（`tests/unit/upload/use-image-uploads*.test.ts`、editor-image-paste / upload-card E2E 通过）；普通文本粘贴不受影响
- **不在本任务**: 外链实况播放（任务 5）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-13](../../product/features/F-001-文章写作/stories/post-editor/US-13-afilmory-photo-embed/story.md) AC1–AC5；BH-01 – BH-07 |
| 设计依据 | [admin-post-editor"粘贴 Afilmory 照片"](../../ui/pages/admin-post-editor.md) · [media-upload module-spec §1](../../engineering/frontend/modules/media-upload/module-spec.md) · [editor module-spec §1](../../engineering/frontend/modules/editor/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-169、UT-170（含 TC-US13-14）：识别矩阵、引用生成 | 单元 |
| 2 | UT-175：`insertAfilmoryPhotos` 顺序、失败、重试、401 | 单元 |
| 3 | [TC-US13-01、02、03](../../test/features/F-001-文章写作/acceptance/post-editor/US-13-tests.md)：单张、链接、多张成组 | E2E |
| 4 | TC-US13-04、05、06：标签提示、普通文本、失败 / 重试 / 移除 | E2E |
| 5 | TC-US13-07（插入部分）：实况开关开 / 关 | E2E |

## DoD（完成定义）

- [x] 一次粘贴的多张按代码顺序一行一张
- [x] 测试清单全部由红变绿

## 依赖

[add-afilmory-photo-api](add-afilmory-photo-api.md)、[render-external-photos](render-external-photos.md)

## 影响的文件

- `src/lib/afilmory/paste.ts`、`markdown.ts`、`client.ts`（新建）
- `src/lib/upload/use-image-uploads.ts`、`src/components/admin/editor/UploadCard.tsx`、`MarkdownEditor.tsx`
- `tests/unit/afilmory/`（新建）、`tests/unit/upload/`、`tests/e2e/afilmory-photos.spec.ts`

## 回滚策略

`onBodyPaste` 去掉文本识别分支

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| media-upload / editor module-spec、admin-post-editor、components.md `UploadCard` | 标注已实现 |
| [sprint-8/_index.md](_index.md) | 状态 → completed |
