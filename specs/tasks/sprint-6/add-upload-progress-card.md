# add-upload-progress-card: 上传进度卡片（缩略图 + 阶段 + 真实上传进度）

**Sprint**: Sprint 6
**序号**: 3
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/`、`src/components/admin/editor/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [media-upload-experience](../../backlog/media-upload-experience.md)

## 意图声明

- **改动意图**: 新增 `UploadCard` 组件（等待 / 压缩 / 上传状态，缩略图 blob URL、进度条、阶段文案），`use-image-uploads` 改为 `UploadTask` 列表（stage、progress、thumbUrl），`upload-client` 改用 XHR 上报 `upload.onprogress`，`stageProgress` 映射进度；`MarkdownPreview` 按占位序号挂载 `UploadCard`（同槽位跨渲染复用实例）。成功后卡片淡出换成正式图片
- **影响范围**: `src/components/admin/editor/UploadCard.tsx`（新建）、`MarkdownPreview.tsx`、`src/lib/upload/upload-client.ts`、`use-image-uploads.ts`、`progress.ts`（新建）
- **不变量**: 源码占位文本与顺序规则不变（US-05 BH-04、BH-09）；并发 2 不变；失败仍按现有方式处理（任务 4 再改）
- **不在本任务**: 失败卡片、重试 / 移除（任务 4）；实况阶段与"仅转为静态图"（任务 7、8）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-05](../../product/features/F-001-文章写作/stories/post-editor/US-05-image-upload/story.md) AC1、AC6；BH-01、BH-12 |
| 设计依据 | [admin-post-editor"上传进度卡片"](../../ui/pages/admin-post-editor.md) · [components.md `UploadCard`](../../ui/components.md) · [media-upload module-spec §2–§3"进度""上传"](../../engineering/frontend/modules/media-upload/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-157、UT-158](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：`stageProgress` 区间与单调；XHR 进度回调与错误分类（fake XHR） | 单元 |
| 2 | UT-159（等待 / 压缩 / 上传三态）、UT-160：`UploadCard` 渲染与 blob URL 生命周期 | 单元 |
| 3 | [TC-US05-36](../../test/features/F-001-文章写作/acceptance/post-editor/US-05-tests.md)：卡片缩略图、阶段文案、进度递增到 100%、成功后淡出 | E2E |
| 4 | TC-US05-28（成功部分）：三张同时上传，各自卡片、并发 ≤ 2、"等待中…" | E2E |
| 5 | TC-US05-23（改）：占位与卡片出现、完成后替换 | E2E |

## DoD（完成定义）

### 实现类
- [x] `UploadCard` 的 props、`data-testid`、`data-state` 与 components.md 一致
- [x] 卡片阶段文案在 `aria-live="polite"` 区域，只在阶段切换时更新
- [x] 减弱动效时不淡出、进度条无过渡

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（E2E chromium 通过，webkit 补跑一次）
- [x] 影响范围回归：本任务改动直接波及的已有测试文件通过（见"影响的文件"中的已有测试）
- [x] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-image-compression](add-image-compression.md)、[strip-reader-upload-placeholders](strip-reader-upload-placeholders.md)

## 影响的文件

- `src/components/admin/editor/UploadCard.tsx`（新建）、`MarkdownPreview.tsx`
- `src/lib/upload/upload-client.ts`、`use-image-uploads.ts`、`progress.ts`（新建）
- `tests/unit/upload/upload-client.test.ts`、`tests/unit/upload/progress.test.ts`（新建）、`tests/unit/editor/upload-card.test.tsx`（新建）
- `tests/e2e/editor-upload-card.spec.ts`（新建）、`tests/e2e/editor-image-paste.spec.ts`、`editor-image-drop.spec.ts`

## 回滚策略

恢复 `upload-client` 的 fetch 实现与占位块渲染，删除 `UploadCard` 与 `progress.ts`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | `upload-client` XHR、`progress.ts`、任务列表标注"已实现" |
| [components.md](../../ui/components.md) | `UploadCard` 行补"已实现：路径" |
| [admin-post-editor](../../ui/pages/admin-post-editor.md) | "上传进度卡片"补"已实现" |
| [sprint-6/_index.md](_index.md) | 本任务状态 → completed |
