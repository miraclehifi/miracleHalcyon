# 设计稿组件整理（与前端组件同名）

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P1-High |
| 来源 | 作者需求 |
| 日期 | 2026-10-10 |
| 创建者 | miraclehifi |

## 描述

整理 [admin.pen](../ui/admin.pen) 的组件：画布分为"组件区 / 页面区"两块；现有组件按前端命名规则校正，页面中重复出现的结构抽成组件并改为实例引用；输出组件对照表，开发时设计稿组件名与 React 组件名一致。

## 目标与验收

**目标**: 设计稿组件即前端组件清单，名称一一对应，implement 阶段可直接按表建组件。

**验收条件**:
- [x] admin.pen 单文件分区：顶部组件区（按类别分组，带区块标题），下方页面区（01–04 及移动版）
- [x] 组件命名 `组件名/变体`：组件名 PascalCase 与 React 组件同名，斜杠后为 `variant`（如 `Button/Primary` ↔ `<Button variant="primary">`）
- [x] 页面中重复结构（顶栏、分段控件、搜索框、文章列表行、分页、图标按钮、确认弹窗、横幅等）抽成组件，页面改为引用实例，视觉不变
- [x] [components.md](../ui/components.md) 列出：设计稿组件 ↔ 前端组件 ↔ variant/props ↔ 使用页面

## 影响分析

- **影响范围**: `specs/ui/admin.pen`、新增 `specs/ui/components.md`、`specs/ui/pages/*.md` 的原型引用
- **依赖项**: 无
- **被依赖**: F-001 后续 design-arch（前端组件结构）、plan-tasks、implement
- **决策**: 不拆成两个 .pen 文件——Pencil 不支持跨文件引用组件，拆开后组件需复制、改动不联动

## 估算

- **规模**: M

## 备注

- 属于 F-001 当前 `ui_design` 阶段的设计资产整理，不涉及代码
