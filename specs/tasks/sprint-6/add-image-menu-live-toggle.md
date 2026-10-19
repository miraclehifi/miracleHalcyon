# add-image-menu-live-toggle: 图片菜单"实况"勾选项

**Sprint**: Sprint 6
**序号**: 9
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/editor/`、`src/lib/upload/`、`src/components/admin/editor/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [media-upload-experience](../../backlog/media-upload-experience.md)

## 意图声明

- **改动意图**: `toggleMark` 支持 `live`（加在片段末尾、去掉时保留其他标记）；`hasLiveVideo(url)` 用 `Range: bytes=0-0` 检查 `.live.mp4`，按 URL 会话内缓存；`ImageMenu` 单图菜单在 `hasLiveVideo` 为 true 时显示"实况"勾选项，改写源码可撤销
- **影响范围**: `src/lib/editor/image-marks.ts`（`toggleMark`）、`src/lib/upload/live-video-check.ts`（新建）、`ImageMenu.tsx`、`MarkdownPreview.tsx`（传 `hasLiveVideo` / `onToggleLive`）
- **不变量**: "宽图"与组图菜单行为不变（TC-US12-09 ~ 18 回归）；服务端不改
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-12](../../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/story.md) AC4；BH-14、BH-15 |
| 设计依据 | [admin-post-editor"图片菜单"](../../ui/pages/admin-post-editor.md) · [editor module-spec §1、§3](../../engineering/frontend/modules/editor/module-spec.md) · [media-upload module-spec §3"实况视频检查"](../../engineering/frontend/modules/media-upload/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-164](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：`toggleMark(live)` 片段矩阵（= TC-US12-21） | 单元 |
| 2 | UT-165：`ImageMenu` 实况项显示条件、勾选状态、检查函数只调用 1 次 | 单元 |
| 3 | [TC-US12-19](../../test/features/F-001-文章写作/acceptance/post-editor/US-12-tests.md)：`#wide,live` 取消 / 恢复实况，保留 `wide`，可撤销（夹具用已有的 `jjjjjjjjjj_960x1280_6b7f8e.jpg` + `.live.mp4`） | E2E |
| 4 | TC-US12-20：无视频的图片不显示"实况"项，第二次打开不再请求 | E2E |

## DoD（完成定义）

### 实现类
- [x] 菜单检查只对站内图片 key 发起请求

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（E2E chromium 通过，webkit 补跑一次）
- [x] 影响范围回归：本任务改动直接波及的已有测试文件通过（见"影响的文件"中的已有测试）
- [x] `npm run lint` 与 `npm run check` 无错误

## 依赖

—（无）

## 影响的文件

- `src/lib/editor/image-marks.ts`、`src/lib/upload/live-video-check.ts`（新建）
- `src/components/admin/editor/ImageMenu.tsx`、`MarkdownPreview.tsx`
- `tests/unit/editor/image-marks.test.ts`、`tests/unit/editor/image-menu.test.tsx`
- `tests/e2e/image-menu.spec.ts`

## 回滚策略

去掉实况项与 `hasLiveVideo`，`toggleMark` 恢复只支持 `wide`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `ImageMenu` 实况项补"已实现" |
| [editor module-spec](../../engineering/frontend/modules/editor/module-spec.md) | "图片菜单实况项"标注"已实现" |
| [sprint-6/_index.md](_index.md) | 本任务状态 → completed |
