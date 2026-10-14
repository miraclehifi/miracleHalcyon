# add-icon-button-tooltips: 图标按钮悬停提示

**Sprint**: Sprint 2
**序号**: 7
**状态**: pending
**类别**: FRONTEND
**架构层级**: 表现层
**所属 Feature**: [F-001 文章写作](../../product/features/F-001-文章写作/feature-scope.md)
**来源 PBI**: [editor-warm-tooltip](../../backlog/editor-warm-tooltip.md)

## 意图声明

- **改动意图**: 新增 `Tooltip` / `TooltipGroup`（底层 React Bits WarmTooltip），写文章页工具栏、顶栏和设置抽屉的图标按钮悬停 400ms 出提示；相邻按钮共用一个提示；提示里显示快捷键键帽（Mac `⌘`，其他 `Ctrl`）
- **影响范围**: `src/components/ui/Tooltip.tsx`（新建）、`src/components/vendor/react-bits/WarmTooltip.tsx`（新建）、`EditorToolbar.tsx`、`EditorTopBar.tsx`、`PostSettingsDrawer.tsx`；新增依赖 `motion`
- **不变量**: 按钮的点击行为、可访问名称不变；带文字的桌面按钮不加提示（UI 决定 #6）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-10 格式工具栏](../../product/features/F-001-文章写作/stories/post-editor/US-10-format-toolbar/story.md) |
| 设计依据 | [components.md `Tooltip`](../../ui/components.md) · [design-tokens"悬停提示"](../../ui/design-tokens.md) · [admin-post-editor"工具栏与悬停提示"](../../ui/pages/admin-post-editor.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | [TC-US10-06](../../test/features/F-001-文章写作/acceptance/post-editor/US-10-tests.md) / UT-120、UT-121、UT-123：悬停 400ms 显示提示与键帽 | 单元 + E2E |
| 2 | TC-US10-07 / UT-122：提示组预热，相邻按钮共用一个提示 | 单元 |
| 3 | TC-US10-08 / UT-124、UT-125：键盘聚焦立即显示、Esc 关闭、`aria-describedby` | 单元（a11y） |
| 4 | TC-US10-09：手机长按显示提示且不触发操作 | E2E |
| 5 | TC-US10-10：顶栏与抽屉图标按钮的提示 | E2E |

## DoD（完成定义）

### 实现类
- [ ] `WarmTooltip.tsx` 按 components.md 改源码（许可证随文件保留）；页面只引用 `Tooltip` / `TooltipGroup`
- [ ] `prefers-reduced-motion` 时按 design-tokens 降级

### 测试类
- [ ] 变更点测试：上述测试清单全部由红变绿
- [ ] 影响范围回归：`npm test`、`npm run test:e2e` 全部通过
- [ ] `npm run lint` 与 `npm run check` 无错误

## 依赖

[build-format-toolbar](build-format-toolbar.md)

## 影响的文件

- `src/components/ui/Tooltip.tsx`、`src/components/vendor/react-bits/WarmTooltip.tsx`（新建）
- `src/components/admin/editor/EditorToolbar.tsx`、`EditorTopBar.tsx`、`PostSettingsDrawer.tsx`
- `tests/unit/ui/tooltip.test.tsx`、`tests/e2e/editor-tooltip.spec.ts`（新建）

## 回滚策略

回退新增组件与按钮包裹；移除 `motion` 依赖

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [sprint-2/_index.md](_index.md) | 本任务状态 → completed |
| [editor-warm-tooltip](../../backlog/editor-warm-tooltip.md) | implement 验收项勾选，状态 → done |
| components.md `Tooltip` | 标注"已实现" |
