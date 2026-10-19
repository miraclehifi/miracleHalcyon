# add-upload-failure-actions: 上传失败卡片：重试与移除

**Sprint**: Sprint 6
**序号**: 4
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/`、`src/lib/editor/`、`src/components/admin/editor/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [media-upload-experience](../../backlog/media-upload-experience.md)

## 意图声明

- **改动意图**: 失败时占位改为 `![上传失败]()`、任务进入 `error`（带原因：网络中断 / 上传超时 / 服务端文案），`UploadCard` 显示红框与"重试""移除"，不再弹 Toast；`retry(id)` 从压缩重跑，`remove(id)` 经 `applyEdit` 删占位（可撤销）。图片错误 Toast 只保留上传前校验
- **影响范围**: `use-image-uploads.ts`（retry / remove）、占位函数（`setPlaceholderState`）、`UploadCard.tsx`（error 态）、Toast 调用处
- **不变量**: 上传前校验（50MB、格式）仍为 Toast 且不生成卡片；实况照片图片与视频不留半对
- **不在本任务**: 刷新后孤立占位的"上传已中断"（任务 5）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) AC5；BH-07、BH-10、BH-11 · [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC7 |
| 设计依据 | [media-upload module-spec §3"失败""重试 / 移除"](../../engineering/frontend/modules/media-upload/module-spec.md) · [editor module-spec §1](../../engineering/frontend/modules/editor/module-spec.md) · [admin-post-editor"上传进度卡片"](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-89、UT-146、UT-158（失败分类）、UT-159（error 态）、UT-161（retry / remove）](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) | 单元 |
| 2 | [TC-US05-12、TC-US05-13](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md)：离线 / 中断 / 500 / 超时 → 失败卡片与对应原因，不弹 Toast | E2E |
| 3 | TC-US05-26：失败后重试成功，引用落在原位置 | E2E |
| 4 | TC-US05-27：移除删掉占位，可撤销 | E2E |
| 5 | TC-US05-25、TC-US05-28（失败部分）：上传中输入的文字保留；多张中一张失败不影响其他 | E2E |

## DoD（完成定义）

### 实现类
- [x] 失败原因文案与 module-spec"上传"一行一致
- [x] `retry` 复用原 `File` 与缩略图 URL，`remove` 回收缩略图 URL
- [x] `editor-image-errors.spec.ts` 中原"失败移除占位 + Toast"的断言改为失败卡片

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（E2E chromium 通过，webkit 补跑一次）
- [x] 影响范围回归：本任务改动直接波及的已有测试文件通过（见"影响的文件"中的已有测试）
- [x] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-upload-progress-card](add-upload-progress-card.md)

## 影响的文件

- `src/lib/upload/use-image-uploads.ts`、`upload-item.ts`、占位函数所在文件
- `src/components/admin/editor/UploadCard.tsx`
- `tests/unit/upload/*`、`tests/unit/editor/upload-card.test.tsx`
- `tests/e2e/editor-image-errors.spec.ts`、`tests/e2e/editor-upload-card.spec.ts`

## 回滚策略

恢复失败时移除占位 + Toast 的处理，去掉 error 态与 retry / remove

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | 失败 / 重试 / 移除标注"已实现" |
| [sprint-6/_index.md](_index.md) | 本任务状态 → completed |
