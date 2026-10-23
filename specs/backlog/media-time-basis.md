# 海报墙"按时间"可选看过 / 发售时间，游戏悬停显示发售年份

| 字段 | 值 |
|------|-----|
| 状态 | scheduled |
| 类型 | Enhancement |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-23 |
| 创建者 | miraclehifi |

## 描述

1. 海报墙（所有分类，见 [media-wall-all-types](media-wall-all-types.md)）的"按时间"打开后，可以选择分段依据：**标记时间**（看过 / 玩过的日期，原有规则）或 **发行年份**（书 / 漫画"出版年份"、电影"上映年份"、剧集"首播年份"、游戏"发售年份"、桌游"发行年份"，取条目的 `year`）。
2. 游戏海报正面悬停时，除平台徽标外再显示发售年份（只显示数字，如"2024"）；游戏背面去掉平台徽标。

## 目标与验收

**验收条件**:

- [x] 设计稿 [admin.pen](../ui/admin.pen)：组件区 Row 7 `YearBadge`、`MediaTimeBasis`；09d 工具栏加 `MediaTimeBasis`（看过时间）；新增 09g（游戏按发售年份分段）；`MediaPoster/Back` 去掉平台区，游戏悬停示例加年份
- [x] 规格同步：[reader-media.md](../ui/pages/reader-media.md)、[components.md](../ui/components.md)、US-03 与验收、reader module-spec
- [ ] "按时间"打开后出现两项切换，默认"看过时间 / 玩过时间"；选择记在浏览器（`localStorage` `media:by-time`：`"0"` 关、`"marked"`、`"release"`；旧值 `"1"` 视为 `"marked"`）
- [ ] 按发行年份：每年一段、倒序，标题为四位年份，meta"{n} 部 / 款"；没有年份的条目归最后一段"未知年份"；不出现"在看 / 在玩"段，段内进行中在前、其余按标记日期倒序
- [ ] 游戏悬停：左下平台徽标、右下年份徽标（无年份不显示）；背面不显示平台

## 影响分析

- **影响范围**: UI（`MediaPoster`、`MediaTimeToggle`、新增 `YearBadge`、`MediaTimeBasis`）、reader `shelf-time.ts`（新增 `groupByReleaseYear`）、US-03 AC13 / AC14、BH-20 / 21、新增 BH-23；无数据与接口变更（`year` 已在公开数据中）
- **依赖项**: 无新依赖；依赖 [game-case-shelf](game-case-shelf.md) 任务 14（游戏海报墙）
- **决策**（2026-10-23）:

| 项 | 决定 | 来源 |
|----|------|------|
| 背面平台 | 去掉；平台只在正面悬停时显示（触屏设备看不到平台） | 作者指示 |
| 悬停年份 | 游戏正面悬停显示发售年份，只显示数字 | 作者指示 |
| 排序依据 | 电影、剧集、游戏的"按时间"都可选标记时间或发行年份 | 作者指示 |
| 控件形态 | "按时间"按钮右侧出现两项分段切换（`MediaTimeBasis`），只在打开时出现 | AI |
| 年份来源 | 条目 `year`（豆瓣识别：书 / 漫画为出版年，影视为上映年，游戏为发售年）；剧集文案"首播年份" | AI |
| 电影悬停 | 电影、剧集悬停仍只显示片名，不加年份 | AI（作者只要求游戏） |

## 估算

- **规模**: S

## 备注

- 排入 [Sprint 9](../tasks/sprint-9/_index.md) 任务 15
