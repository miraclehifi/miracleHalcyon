# 全站按钮改用 SpecularButton 质感

| 字段 | 值 |
|------|-----|
| 状态 | ready |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-12 |
| 创建者 | miraclehifi |

## 描述

文字按钮改用 [React Bits SpecularButton](https://reactbits.dev)（TypeScript + Tailwind 版）的质感：玻璃底 + WebGL 边缘流光，光点跟随鼠标、靠近时增亮。替换范围是 `Button`（6 个变体）；图标按钮 `IconButton`、`OverlayButton` 不改。组件名与 Props 保持 [components.md](../ui/components.md) 不变，SpecularButton 只作底层实现，不在页面里直接使用。

## 目标与验收

**目标**: 按钮有统一的边缘流光质感，同时保留现有令牌配色、亮暗主题、无障碍与触屏规则。

**验收条件**:
- [x] [design-tokens.md](../ui/design-tokens.md) 写明按钮属于"不用渐变 / 阴影"的例外；`tint`、`textColor`、`lineColor`、`baseColor` 按亮暗主题各一套并定义为令牌，两套文字对比度 ≥ 4.5:1
- [x] [components.md](../ui/components.md) 写明 `Button` 底层改用 SpecularButton，以及变体到参数的对照
- [x] [admin.pen](../ui/admin.pen) 组件区按钮改为边缘高光样式（Pencil 不能跑 WebGL，用静态渐变描边表示静止态），页面实例自动跟随
- [ ] 焦点环、可点区域（桌面 ≥ 28px，触屏 ≥ 44px）、`radius` 8px 与现有规则一致，不用 SpecularButton 自带的焦点样式
- [ ] `prefers-reduced-motion` 时光点不跟随鼠标、不做按下缩放；WebGL 不可用时退回只显示 `baseColor` 细边

## 影响分析

- **影响范围**: `specs/ui/design-tokens.md`、`specs/ui/components.md`、`specs/ui/admin.pen` 组件区；implement 阶段新增 `SpecularButton` 底层组件
- **依赖项**: 无
- **被依赖**: F-001 design-arch（前端组件结构）、implement
- **决策**（2026-10-12 与作者确认）:
  - 范围：只改 `Button`。最初定为所有可点按钮，同日作者改为图标按钮（`IconButton`、`OverlayButton`）不改；`SegmentedControl.Item`、`Tabs.Item`、`DropdownMenu.Item` 是选择 / 菜单项，也不改
  - 配色：先定为映射到暖棕令牌，同日作者改为直接用 React Bits 两套预设——亮色深色实心（`#18181b` / `#fafafa` / `#3f3f46`），暗色白色玻璃（`#ffffff` 4% / `#f5f5f5` / `#525252`），6 个变体同色
  - 令牌规则：按钮单独豁免"不用渐变 / 阴影"，其他组件仍守纸质风格

## 待 design-arch 解决

- **WebGL 上下文上限**：每个按钮一个 WebGL 上下文，浏览器同时只保留约 16 个。图标按钮不用后压力小很多，但写文章页（顶栏 + 设置抽屉 + 弹窗）仍需核对数量。方向：静止态用 CSS 画边缘（`baseColor` 细边 + 静态高光），只在指针靠近（`proximity`）或聚焦时挂载 WebGL 画布，离开后释放；或全页共用一个画布
- **颜色解析**：`lineColor` / `baseColor` 由 2D canvas 解析，不认识 `var(--…)`；需用 `getComputedStyle` 取令牌实际值，主题切换时重新取色
- **画布溢出**：画布比按钮四周各大 24px，放在 `overflow: hidden` 容器（抽屉、弹窗）里会被裁，需确认布局
- **SSR**：Astro 预渲染时组件只输出按钮本身，WebGL 在客户端 hydrate 后启用；读者端按钮少，可用 `client:visible`

## 估算

- **规模**: M

## 备注

- 当前处于 F-001 `ui_design` 阶段，本条先更新设计规格；代码在 plan-tasks 之后按 Sprint 任务实现
