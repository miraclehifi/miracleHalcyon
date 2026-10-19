# add-live-photo-toggle: 工具栏"实况照片"开关（默认关闭）

**Sprint**: Sprint 6
**序号**: 7
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/upload/`、`src/components/`）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [media-upload-experience](../../backlog/media-upload-experience.md)

## 意图声明

- **改动意图**: `IconButton` 加 `checked`（`role="switch"`），`EditorToolbar` 与手机工具栏末尾加"实况照片"开关；`live-pref.ts` 读写本地存储（异常按关闭）；任务创建时快照 `task.live`，关闭时动态照片只传压缩后的静态图、不加载 mediabunny；开启时卡片显示"正在处理实况视频…"阶段（15–40%）。现有实况照片 E2E 前置改为先开启开关
- **影响范围**: `IconButton.tsx`、`EditorToolbar.tsx`、`live-pref.ts`（新建）、`use-image-uploads.ts` / `upload-item.ts`（live 参数）、`UploadCard.tsx`（processing-live 态）
- **不变量**: 开关开启时的实况照片行为与现有 US-11 一致（TC-US11-01、05、06、07、09、10、16、17 前置开启后仍通过）
- **不在本任务**: "仅转为静态图"按钮（任务 8）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-11](../../product/features/F-001-文章写作/stories/post-editor/US-11-live-photo-upload/story.md) AC1、AC4、AC7、AC9；BH-05、BH-08、BH-14、BH-15 |
| 设计依据 | [admin-post-editor"实况照片开关"](../../ui/pages/admin-post-editor.md) · [components.md `IconButton` checked](../../ui/components.md) · [media-upload module-spec §3"实况开关"](../../engineering/frontend/modules/media-upload/module-spec.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-162、UT-163、UT-152（`live: false`）](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：存储读写与异常、开关可访问性、关闭时不调 `processVideo` | 单元 |
| 2 | [TC-US11-26](../../test/features/F-001-文章写作/acceptance/post-editor/US-11-tests.md)：默认关闭，动态照片只传静态图、无 mediabunny 请求、无 `.live.mp4`、引用不带 `#live` | E2E |
| 3 | TC-US11-27：开关持久化；存储抛错按关闭且页面可用 | E2E |
| 4 | TC-US11-22（改）：开启时卡片三阶段文案与进度区间；普通图片跳过视频阶段 | E2E |
| 5 | TC-US11-14（改）+ 现有实况照片 E2E 前置开启开关：失败卡片 + 重试带视频；其余用例回归通过 | E2E |

## DoD（完成定义）

### 实现类
- [x] 本地存储键 `mh:live-photo`，值 `1` / `0`
- [x] 切换开关不影响已在队列中的任务
- [x] `IconButton` 无 `checked` 时渲染与行为不变（工具栏其余按钮回归）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（E2E chromium 通过，webkit 补跑一次）
- [x] 影响范围回归：本任务改动直接波及的已有测试文件通过（见"影响的文件"中的已有测试）
- [x] `npm run lint` 与 `npm run check` 无错误

## 依赖

[add-upload-failure-actions](add-upload-failure-actions.md)

## 影响的文件

- `src/components/ui/IconButton.tsx`、`src/components/admin/editor/EditorToolbar.tsx`、`PostEditorPage.tsx`（如开关状态在页面层）
- `src/lib/upload/live-pref.ts`（新建）、`use-image-uploads.ts`、`upload-item.ts`、`UploadCard.tsx`
- `tests/unit/upload/live-pref.test.ts`（新建）、`tests/unit/upload/upload-item.test.ts`、`tests/unit/editor/`（工具栏）
- `tests/e2e/live-photo-upload.spec.ts`、`tests/e2e/editor-toolbar.spec.ts`

## 回滚策略

去掉开关与 `live` 参数，动态照片恢复为始终保留视频

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [media-upload module-spec](../../engineering/frontend/modules/media-upload/module-spec.md) | 实况开关标注"已实现" |
| [components.md](../../ui/components.md) | `IconButton` checked 补"已实现" |
| [admin-post-editor](../../ui/pages/admin-post-editor.md) | "实况照片开关"补"已实现" |
| [sprint-6/_index.md](_index.md) | 本任务状态 → completed |
