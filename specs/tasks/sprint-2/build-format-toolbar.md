# build-format-toolbar: 实现格式工具栏与快捷键

**Sprint**: Sprint 2
**序号**: 1
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（`src/lib/editor/` 纯函数 + 组件）
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [article-writing](../../backlog/article-writing.md) · [editor-warm-tooltip](../../backlog/editor-warm-tooltip.md)

## 意图声明

- **改动意图**: 编辑区上方加工具栏（9 个按钮），点击或按快捷键给选中文字加 / 去格式；所有改写源码的操作走统一入口 `applyEdit`，可用 Ctrl/Cmd+Z 撤销
- **影响范围**: `src/lib/editor/`（新建）、`MarkdownEditor.tsx`、`EditorToolbar.tsx`（新建）
- **不变量**: 自动保存、预览、Ctrl/Cmd+S 立即保存行为不变（`tests/e2e/editor-autosave.spec.ts`、`editor-preview.spec.ts` 保持通过）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-10 格式工具栏](../../product/features/F-001-文章写作/stories/post-editor/US-10-format-toolbar/story.md) · [behaviors](../../product/features/F-001-文章写作/stories/post-editor/US-10-format-toolbar/behaviors.md) |
| 设计依据 | [editor module-spec §1](../../engineering/frontend/modules/editor/module-spec.md) · [ADR-004](../../engineering/features/F-001-文章写作/architecture/adr/ADR-004-textarea-editor.md) · [admin-post-editor"工具栏与悬停提示"](../../ui/pages/admin-post-editor.md) · [components.md `EditorToolbar`](../../ui/components.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US10-01](../../test/features/F-001-文章写作/acceptance/post-editor/US-10-tests.md) / UT-117：行内格式变换矩阵（`applyFormat`） | 单元 |
| 2 | TC-US10-02 / UT-118：行级前缀切换矩阵 | 单元 |
| 3 | TC-US10-04 / UT-119：快捷键映射 `matchShortcut` + 编辑器内执行命令并 `preventDefault` | 单元 + E2E |
| 4 | TC-US10-03：点击"加粗"后 Ctrl/Cmd+Z 还原；ED-UT-01：`execCommand` 返回 false 时退回 `setRangeText` | E2E + 单元 |
| 5 | TC-US10-05：输入法组字期间快捷键不触发 | E2E |

## DoD（完成定义）

### 实现类
- [x] `src/lib/editor/format-commands.ts`：`applyEdit`、`applyFormat`；`shortcuts.ts`：`matchShortcut`
- [x] `EditorToolbar` 9 个按钮（按 components.md 的名称与图标），"插入图片"按钮先占位、不接上传（由 add-image-drop-and-pick-upload 接入）
- [x] 不设快捷键的按钮：二级标题、任务列表、插入图片（UI 决定 #6）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿
- [x] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [x] `npm run lint` 与 `npm run check` 无错误

## 实现记录

- `src/lib/editor/format-commands.ts`：`applyFormat`（行内包裹 / 取消；斜体不把 `**` 的一半当成斜体；链接选中 `url`；行级命令作用于选区覆盖的整行，全部已有该前缀时去掉，否则替换为该前缀，`- [ ] ` 先于 `- ` 识别）、`applyEdit`（`execCommand('insertText')`，空插入用 `delete`；不可用时 `setRangeText` + 派发 `input`）
- `src/lib/editor/shortcuts.ts`：`matchShortcut`、`isMacPlatform`
- `EditorToolbar.tsx`：`role="toolbar"`，按钮 `mousedown` 阻止默认行为以保留源码区焦点与选区；手机隐藏斜体、任务列表，按钮 44px；"插入图片"在上传接入前禁用（add-image-drop-and-pick-upload 接入）
- 图标按 lucide 命名登记到 `icons.ts`：`heading-2`、`bold`、`italic`、`link`、`code`、`list`、`list-todo`、`text-quote`、`image-plus`
- 未做（不在本任务测试范围）：手机工具栏"固定在键盘上方"的定位，留到 add-editor-view-modes 处理窄屏布局时一并实现

## 依赖

无（Sprint 2 起点）

## 影响的文件

- `src/lib/editor/format-commands.ts`、`src/lib/editor/shortcuts.ts`（新建）
- `src/components/admin/editor/EditorToolbar.tsx`（新建）、`MarkdownEditor.tsx`
- `tests/unit/editor/format-commands.test.ts`、`tests/e2e/editor-toolbar.spec.ts`（新建）

## 回滚策略

回退本任务新增 / 修改的文件（无数据副作用）

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| status.yaml | `implementation` 进度 |
| editor module-spec §1 | 标注"已实现" |
