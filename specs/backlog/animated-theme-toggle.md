# 主题切换改为圆形扩散动画

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-15 |
| 创建者 | miraclehifi |

## 描述

读者端顶栏的主题切换改用 [Magic UI Animated Theme Toggler](https://magicui.design/docs/components/animated-theme-toggler) 的交互：点击后新主题以按钮中心为圆心、用 View Transitions 圆形扩散覆盖整页。图标换成作者指定的"半填充圆"（tabler `contrast` 类，圆 + 竖线 + 三条斜线），不随状态变化。

## 目标与验收

**目标**: 切换主题有明确的视觉过渡，同时保持"读者端不加载 React"、首屏不闪、无障碍规则不变。

**验收条件**:
- [x] [reader-shell.md](../ui/pages/reader-shell.md)"主题切换"改为两态 + 扩散动画规则；[components.md](../ui/components.md) `ThemeToggle` 行同步
- [x] [admin.pen](../ui/admin.pen) `SiteNav`、`SiteNav/Mobile` 的主题切换图标换成半填充圆
- [x] 点击后主题在亮 / 暗之间翻转，以按钮中心圆形扩散，约 400ms
- [x] 不支持 View Transitions、或 `prefers-reduced-motion: reduce` 时直接切换，无动画
- [x] 动画进行中再次点击被忽略；不影响站内其他过渡

## 影响分析

- **影响范围**: `ThemeToggle.astro`、`src/lib/reader/theme-toggle.ts`、`src/styles/global.css`；F-002 US-01 行为 BH-02 与 TC-US01-02、READER 单元测试；后台页面（共用存储键，不受影响）
- **依赖项**: 无
- **决策**（2026-10-15，AI 设计，作者要求文档阶段不逐项确认）:
  - **三态改两态**：Magic UI 是亮 / 暗两态，且新图标固定不变，三态时看不出当前是"跟随系统"。改为点击在亮 / 暗之间翻转（以当前实际配色为准）；从未点过时仍跟随系统（首屏与系统变化实时跟随），存储里旧值 `system` 视为未选择
  - **只移植圆形变体**：不引入 `variant`、`fromCenter` 等参数；用原生脚本实现，不引入 React、`flushSync`、`lucide` 太阳 / 月亮图标
  - **clip-path 用百分比坐标**：沿用原组件的处理（Windows 小数缩放下 px 坐标首帧错位）

## 估算

- **规模**: S

## 备注

- SDD-Lite：单一 US（US-01）增量，无新 Domain、无架构变更。F-002 处于 code_review，任务并入 Sprint 4（第 20 项 [animate-theme-toggle](../tasks/sprint-4/animate-theme-toggle.md)）
