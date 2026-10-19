# add-still-only-action: "仅转为静态图"：单张放弃实况视频

**Sprint**: Sprint 6
**序号**: 8
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/`、`src/components/admin/editor/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [media-upload-experience](../../backlog/media-upload-experience.md)

## 意图声明

- **改动意图**: `processing-live` 阶段的卡片显示"仅转为静态图"；`stillOnly(id)` 用 `AbortController` 中止本项 `processVideo`（不支持取消时忽略其结果），`task.live = false`，直接进入上传；其他任务与工具栏开关不受影响
- **影响范围**: `use-image-uploads.ts`（stillOnly）、`process-video.ts`（`signal`）、`UploadCard.tsx`（按钮）
- **不变量**: 未点击时实况照片流程不变
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC10；BH-16 |
| 设计依据 | [media-upload module-spec §3"仅转为静态图"](../../engineering/frontend/modules/media-upload/module-spec.md) · [admin-post-editor"上传进度卡片"](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-161（stillOnly）、UT-159（processing-live + 按钮）](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)；`processVideo` 收到 abort 后不再产出结果 | 单元 |
| 2 | [TC-US11-28](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md)：两张动态照片，第一张点"仅转为静态图"后无 `video`、无 `#live`，第二张仍带 `#live`，开关保持开启 | E2E |

## DoD（完成定义）

### 实现类
- [x] 按钮只在 `processing-live` 阶段渲染，进入上传后消失

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（E2E chromium 通过，webkit 补跑一次）
- [x] 影响范围回归：本任务改动直接波及的已有测试文件通过（见"影响的文件"中的已有测试）
- [x] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-live-photo-toggle](add-live-photo-toggle.md)

## 影响的文件

- `src/lib/upload/use-image-uploads.ts`、`process-video.ts`、`src/components/admin/editor/UploadCard.tsx`
- `tests/unit/upload/process-video.test.ts`、`tests/unit/editor/upload-card.test.tsx`
- `tests/e2e/live-photo-upload.spec.ts`

## 回滚策略

去掉按钮与 `stillOnly`、`processVideo` 的 `signal` 参数

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | `stillOnly` 标注"已实现" |
| [sprint-6/_index.md](_index.md) | 本任务状态 → completed |
