# add-image-syntax-help: 底栏"图片写法"说明

**Sprint**: Sprint 3
**序号**: 12
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md)

## 意图声明

- **改动意图**: 编辑区底栏左侧变为"Markdown (GFM) · 支持粘贴/拖入图片 · 图片写法"，"图片写法"文字按钮打开 `Popover`（非模态 `role="dialog"`，`aria-label`"图片写法"，宽 360、最高 60vh）内的 `ImageSyntaxHelp`：5 行写法示例（宽图、实况照片、图注、组图网格、手风琴，每行带复制按钮，复制后 ✓ 1.5 秒；实况照片说明"拖入安卓动态照片会自动生成"）。原"从 iPhone 上传实况照片"一节随 [drop-apple-live-photo](../../backlog/drop-apple-live-photo.md) 删除。打开时焦点到浮层标题，Esc / 点外部关闭、焦点回到按钮。手机：入口放在设置面板最下方，在面板内展开
- **影响范围**: `src/components/ui/Popover.tsx`（新建）、`src/components/admin/editor/ImageSyntaxHelp.tsx`（新建）、`MarkdownEditor.tsx`（底栏）、`PostSettingsDrawer.tsx`（手机入口）
- **不变量**: 底栏字数统计不变；设置抽屉已有字段不变
- **不在本任务**: —

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-12](../../product/features/F-001-文章写作/stories/post-editor/US-12-image-layout-marks/story.md) AC7；behaviors BH-12 |
| 设计依据 | [admin-post-editor"图片写法说明"](../../ui/pages/admin-post-editor.md) · [components.md `Popover` / `ImageSyntaxHelp`](../../ui/components.md) · [feature-ui-coverage 决定 #9](../../ui/features/F-001-文章写作/feature-ui-coverage.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [UT-139](../../test/features/F-001-文章写作/unit/frontend-unit-tests.md)：5 个示例；`role="dialog"`、可访问名称"图片写法" | 组件（R） |
| 2 | [TC-US12-16](../../test/features/F-001-文章写作/acceptance/post-editor/US-12-tests.md)：打开、内容、Esc 关闭、焦点回归（桌面） | E2E |
| 3 | 手机视口：设置面板最下方"图片写法"展开同样内容 | E2E（手机视口） |

## DoD（完成定义）

### 实现类
- [ ] `Popover` 按 components.md 规格（`surface` 底、1px `line` 边、12px 圆角）
- [ ] 复制按钮用 `IconButton/Ghost` + `Tooltip`"复制"
- [ ] components.md 中 `Popover`、`ImageSyntaxHelp` 标注"已实现"

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`MarkdownEditor` / `PostSettingsDrawer` 现有单元测试、US-03 设置抽屉 E2E 通过；E2E 补跑 webkit 一次
- [ ] `npm run lint` 与 `npm run check` 无错误

## ⚠️ 前置确认项

- 手机设置面板形态：页面规格写明"底部弹出的设置面板仍是右侧抽屉铺满，Sprint 3 前再定"。本任务按现状（右侧抽屉铺满）把入口放在抽屉最下方；若作者决定改为底部面板，需先补设计稿与页面规格

## 依赖

无

## 影响的文件

- `src/components/ui/Popover.tsx`、`src/components/admin/editor/ImageSyntaxHelp.tsx`（新建）
- `src/components/admin/editor/MarkdownEditor.tsx`、`PostSettingsDrawer.tsx`
- `tests/unit/components/image-syntax-help.test.tsx`（新建）、`tests/e2e/image-syntax-help.spec.ts`（新建）

## 回滚策略

底栏恢复为"Markdown (GFM)"，删除新增组件

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [components.md](../../ui/components.md) | `Popover`、`ImageSyntaxHelp` 标注"已实现" |
| [admin-post-editor](../../ui/pages/admin-post-editor.md) | 底栏标注"已实现" |
| [sprint-3/_index.md](_index.md) | 本任务状态 → completed |
