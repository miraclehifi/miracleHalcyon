# 书影音所有分类统一为海报墙

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Enhancement |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-23 |
| 创建者 | miraclehifi |

## 描述

书影音读者页里书、漫画（`MediaCard` 两列网格）与桌游（`MediaRow` 列表）还在居中的 896px 窄栏里，与电影、剧集、游戏的满宽海报墙不一致。作者要求"所有模块的布局都和电影统一"，并选择**全部改成海报墙**：满宽、左对齐，Masonry，悬停浮出名称，点击翻面看详情，可按时间分段。

## 目标与验收

**验收条件**:

- [x] 设计稿 [admin.pen](../ui/admin.pen)：重做 09（书）、09m（书 · 移动）、09c（桌游，砖块 1:1）；`MediaCard`、`MediaRow` 及 `/Mobile` 移入存档区"已废弃"
- [x] 规格同步：[reader-media.md](../ui/pages/reader-media.md)（重写为统一海报墙 + 分类差异表）、[components.md](../ui/components.md)、US-03 与验收、reader module-spec、F-005 架构
- [x] 所有分类页主体满宽（左右 50px，手机 20px），没有居中窄栏
- [x] 书、漫画砖块 2:3、桌游 1:1，`object-fit: cover`；游戏按 IGDB 原比例（[game-case-shelf](game-case-shelf.md)）
- [x] 悬停不浮出名称（2026-10-23 [poster-no-hover-title](poster-no-hover-title.md) 取代"悬停浮出名称"）；背面显示名称、评分、短评、"读过 / 玩过 · 日期"、"豆瓣 ↗"，不显示作者 / 开发商
- [x] "按时间"所有分类可用，依据文案：书 / 漫画"读过时间 / 出版年份"，桌游"玩过时间 / 发行年份"（[media-time-basis](media-time-basis.md)）
- [x] 删除 `MediaCard.astro`、`MediaRow.astro` 及其样式与测试引用；读者页每页都有一个海报墙岛

## 影响分析

- **影响范围**: UI（`MediaList`、`MediaPosterWall`、`MediaPoster` 砖块比例；`MediaCard` / `MediaRow` 废弃）；reader `posterAspect`；US-03 AC4、AC10、AC12、AC13，BH-05、06、15、17、19、20；TC-US03-05、06、11、13、15、17 等改口径；构建产物每个分类页都有海报墙岛
- **依赖项**: 无新依赖；在 [game-case-shelf](game-case-shelf.md) 任务 14 与 [media-time-basis](media-time-basis.md) 任务 15 之后做（共用 `MediaPoster` / `MediaPosterWall` 改动）
- **决策**（2026-10-23）:

| 项 | 决定 | 来源 |
|----|------|------|
| 统一方式 | 全部改为海报墙（不是只把卡片 / 列表放宽） | 作者选 |
| 桌游比例 | 砖块 1:1（桌游盒多为方形，2:3 会裁掉过多） | AI |
| 书、漫画比例 | 2:3，同电影 | AI |
| 背面 | 不显示作者 / 开发商（同电影不显示导演） | AI（沿用电影决定） |
| 依据文案 | 书 / 漫画"读过时间 / 出版年份"；桌游"玩过时间 / 发行年份" | AI |
| 废弃组件 | `MediaCard`、`MediaRow` 不再用于读者端，设计稿存档、代码删除；后台列表用的是 `MediaEntryRow`，不受影响 | AI |

## 估算

- **规模**: M

## 备注

- 排入 [Sprint 9](../tasks/sprint-9/_index.md) 任务 16
