# 写文章页图标按钮改用 WarmTooltip 提示

| 字段 | 值 |
|------|-----|
| 状态 | ready |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-12 |
| 创建者 | miraclehifi |

## 描述

写文章页的图标按钮改用 [React Bits WarmTooltip](https://reactbits.dev)（TypeScript + Tailwind 版，依赖 `motion`）做悬停提示。工具栏所有按钮放进同一个提示组：第一次悬停等 400ms 才弹出；提示还开着时（或刚关不到 300ms）移到相邻按钮，提示框会直接滑过去换文字，不再重新等待。提示里同时显示格式快捷键键帽（如 `⌘B`），编辑器同步实现这些快捷键。

项目里新增 `Tooltip` / `TooltipGroup` 两个组件，WarmTooltip 只作底层实现，页面不直接引用（同 `Button` → SpecularButton 的做法）。

## 目标与验收

**目标**: 作者不用逐个试按钮就能知道工具栏每个图标的作用和快捷键，用键盘写作时不必去点工具栏。

**验收条件**:
- [x] [components.md](../ui/components.md) 新增 `Tooltip`（含 `/Shortcut`），写明 WarmTooltip 参数和需要改的源码；`EditorToolbar` 写明使用 `TooltipGroup`
- [x] [design-tokens.md](../ui/design-tokens.md) 新增"悬停提示"：反色配色（`ink` 底 / `bg` 字）、投影与弹出 / 滑动动效的例外、降级规则
- [x] [admin-post-editor.md](../ui/pages/admin-post-editor.md) 写明哪些按钮带提示、提示朝向、快捷键表
- [x] 新增 US-10-format-toolbar（story + behaviors）、验收用例 US-10-tests.md、前端单元测试 UT-117 起
- [x] [admin.pen](../ui/admin.pen) 组件区新增 `Tooltip`、`Tooltip/Shortcut`；03 写文章页工具栏放一个悬停示例；`EditorToolbar` 的"插入图片"改为 `IconButton/Ghost`（`image-plus`）
- [ ] implement：`WarmTooltip.tsx` 按 components.md 改源码；`Tooltip` 按平台显示 `⌘` 或 `Ctrl`

## 影响分析

- **影响范围**: `specs/ui/components.md`、`specs/ui/design-tokens.md`、`specs/ui/pages/admin-post-editor.md`、`specs/ui/admin.pen`、`specs/ui/features/F-001-文章写作/feature-ui-coverage.md`、F-001 stories（新增 US-10、`_index.md`）、`specs/test/features/F-001-文章写作/`（新增 US-10-tests.md、frontend-unit-tests.md）；implement 阶段新增依赖 `motion`
- **依赖项**: 无
- **被依赖**: F-001 design-arch（编辑器命令与快捷键的实现位置）、implement
- **关联评估**: 工具栏格式命令此前只写在页面规格里、没有 Story 覆盖（US-04 管预览，US-05 只管"插入图片"），快捷键又需要验收用例，因此新建 US-10，归入 post-editor 分组；不新建 Feature
- **决策**（2026-10-12 与作者确认）:
  - 范围：工具栏（桌面 9 个、手机 7 个，一个提示组；桌面"插入图片"同日由文字按钮改为图标按钮，与其他按钮统一）+ 写文章页其他只有图标的按钮（手机返回、手机设置、关闭设置）。带文字的按钮不加
  - 快捷键：提示里显示，并在编辑器实现。沿用 GitHub Markdown 编辑器的习惯：加粗 `Mod+B`、斜体 `Mod+I`、链接 `Mod+K`、行内代码 `Mod+E`、列表 `Mod+Shift+8`、引用 `Mod+Shift+.`；二级标题、任务列表、插入图片不设快捷键（候选组合会和浏览器或输入法冲突）
  - 配色：反色，`ink` 底、`bg` 字，暗色主题随令牌自动反过来

## 待 design-arch 解决

- **快捷键归属**：格式命令与快捷键都作用在源码区的选区上，需和 Ctrl/⌘+S（US-06）放在同一个按键处理里，确认输入法组字（`isComposing`）期间不触发
- **按键识别**：`Mod+Shift+8`、`Mod+Shift+.` 按 `KeyboardEvent.code`（`Digit8`、`Period`）判断，不按 `key`，避免不同键盘布局下失效
- **打包**：`motion` 只在写文章页的岛组件里加载，读者端不引入

## 估算

- **规模**: S

## 备注

- 当前处于 F-001 `ui_design` 阶段，本条先更新设计规格；代码在 plan-tasks 之后按 Sprint 任务实现
