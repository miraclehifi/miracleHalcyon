# 海报墙去掉悬停浮出名称

| 字段 | 值 |
|------|-----|
| 状态 | scheduled |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-23 |
| 创建者 | miraclehifi |

## 描述

海报墙（书、漫画、电影、剧集、桌游）悬停或键盘聚焦时不再在底部浮出名称与黑色渐变；名称只在背面显示。悬停倾斜、放大、反光与点击翻面不变。

## 目标与验收

**目标**: 正面只看封面，画面干净。

**验收条件**:
- [x] 悬停、键盘聚焦海报时正面不出现名称浮层（不渲染 `data-poster-caption`）
- [x] 悬停倾斜、放大 1.02、反光与点击 / Enter / 空格翻面不变；背面仍显示名称
- [x] 无封面占位仍显示名称（占位本身的文字，不是浮层）

## 影响分析

- **影响范围**:
  - 产品 / 测试：US-03 AC12、BH-19、TC-US03-19、TC-US03 标题省略口径
  - UI：components.md `MediaPoster/Hover`、reader-media.md"海报墙""分类差异""省略"、design-tokens.md"海报墙"
  - 代码：`src/components/reader/MediaPoster.tsx`（删浮层，不再引用 Masonry 的 `CAPTION` / `TITLE`）
  - 测试：`tests/e2e/reader-media.spec.ts`（TC-US03-19 悬停步骤改断言无浮层）、单元测试补断言
  - 游戏（Sprint 9 任务 14 未实现）：悬停显示平台与年份徽标的设计不受影响
- **依赖项**: 无
- **决策**（2026-10-23，AI）: 只去掉名称浮层，游戏悬停徽标保留（作者只说电影名称）；`MediaPoster/Hover` 从此只用于游戏

## 估算

- **规模**: XS
