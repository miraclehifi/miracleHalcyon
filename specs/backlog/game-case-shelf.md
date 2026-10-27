# 游戏分类改为海报墙（同电影，悬停显示平台）

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-22 |
| 创建者 | miraclehifi |

## 描述

读者端书影音的游戏分类（`/media/game`）不再用 `MediaRow` 列表行，改为与电影、剧集相同的满宽海报墙（`MediaPosterWall` + `MediaPoster`，可翻面、可按时间分段）。区别只有两点：砖块保持封面原始比例（不裁成 2:3，Masonry 各列错落）；悬停时不浮出游戏名，改为左上角显示该条目的平台徽标（`PlatformBadge`：PS5 / PS4 / Switch / Switch 2 / Steam）；2026-10-23 起右下角另显示发售年份、背面不显示平台（[media-time-basis](media-time-basis.md)）。

## 目标与验收

**目标**: `/media/game` 以海报墙展示条目，封面不裁切，悬停可见平台；桌游仍用 `MediaRow`。

**验收条件**:

- [x] 设计稿 [admin.pen](../ui/admin.pen)：组件区"读者端区块"Row 7 `PlatformBadge`（五个平台）、`MediaPoster/Hover（游戏）` 示例；`MediaPoster/Hover` 组件新增默认隐藏的 `Platform` 区；页面区 `09f 书影音 /media/game（海报墙，同电影；悬停显示平台）`
- [x] [components.md](../ui/components.md)：登记 `PlatformBadge`；`MediaPoster` 补游戏砖块比例与悬停规则；`MediaRow` / `MediaList` 使用范围
- [x] 作者确认设计稿（2026-10-23 "开始写文档"）
- [x] [reader-media.md](../ui/pages/reader-media.md)、[admin-media.md](../ui/pages/admin-media.md)、US-01 / 02 / 03 与验收、F-005 架构（[ADR-013](../engineering/features/F-005-书影音/architecture/adr/ADR-013-game-cover-igdb-link.md)）、shelf 领域文档按本条更新；09c 改为桌游示例，新增 11g（后台游戏表单）与"游戏卡片翻面交互"
- [x] 版式同电影海报墙：满宽、列宽 200 自动（1440 宽 6 列）、间距 16；"按时间"切换、翻面看详情同电影
- [x] 砖块比例与 IGDB 大图实际宽高比完全一致（高 = 列宽 × 图高 ÷ 图宽），封面完整显示不裁切（`object-fit: contain` 兜底）；无封面按 3:4
- [x] 悬停 / 键盘聚焦：不浮出游戏名，左上角淡入平台徽标；触屏设备无悬停（平台不显示）；`prefers-reduced-motion` 时无位移
- [x] 条目新增平台字段（`ps5` / `ps4` / `switch` / `switch2` / `steam`，默认 `ps5`），后台录入表单加选择项
- [x] 录入保存时服务端读取 IGDB 图片的宽高（只读图片头）存入条目，供 Masonry 计算砖块高度；图片加载失败显示无封面占位

## 影响分析

- **影响范围**:
  - UI：`components.md`（`PlatformBadge`、`MediaPoster`、`MediaPosterWall`、`MediaRow` / `MediaList` 使用范围）、`reader-media.md`、`admin-media.md`（平台选择项）、`admin.pen`
  - 产品 / 测试：US-03 中游戏分类的展示口径
  - 工程：`MediaPosterWall` 支持非 2:3 砖块；shelf 领域条目新增平台字段、封面外链地址与宽高（D1 迁移）；后台录入表单（游戏封面填 IGDB 链接）
- **依赖项**: 无新 npm 依赖；读者页直接加载 images.igdb.com（页面无 `img-src` 限制，无需改 CSP）；平台标志用 Simple Icons 官方路径（CC0，内联 SVG，无图片素材）
- **决策**（2026-10-22）:

| 项 | 决定 | 来源 |
|----|------|------|
| 版式 | 与电影海报墙一致，不为游戏单独设计卡片 | 作者指示 |
| 封面比例 | 保持封面原始比例，不裁切 | 作者指示 |
| 悬停 | 显示平台徽标，不显示游戏名 | 作者指示 |
| 先出设计稿 | 先在 admin.pen 设计，确认后再改规格与代码 | 作者指示 |
| 方案演变 | 先后做过按实物的 PS5 / PS4 / Switch / Switch 2 游戏盒、统一 Steam 库样式卡 `GameCard`，均未采用；已移入 admin.pen「存档 · 实体游戏盒（未采用）」，不进入 components.md，参考图仍在 `specs/ui/images/` | 作者指示 |
| 徽标形式 | 平台标志 + 文字（PS5、PS4 共用 PlayStation 标志，Switch、Switch 2 共用 Switch 标志，Simple Icons 无 Switch 2 图标）；位置在左上角（2026-10-23 作者指示，原为左下角） | 作者指示 |
| 封面来源 | **所有游戏封面都直接引用 images.igdb.com 大图链接**，不下载到本站 R2、不调用 IGDB API、不再区分 Steam 等平台的封面规格：`https://images.igdb.com/igdb/image/upload/t_1080p/<图片ID>.jpg`（录入时作者从 igdb.com 游戏页复制图片地址，统一换成 `t_1080p`）。尺寸实测：`t_cover_big` 宽 264、`t_cover_big_2x` 宽 528、`t_720p` 高 720、`t_1080p` 高 1080、`t_original` 原图；**宽高比随原图而定，不一定正好 3:4**（如 co5vmg 为 811×1080） | 作者指示 |
| 范围 | 只改游戏；桌游封面多为方形，仍用列表行 | AI |

## 估算

- **规模**: M

## 备注

- 已排入 [Sprint 9](../tasks/sprint-9/_index.md) 任务 12–14（2026-10-23）
- 文件名沿用 `game-case-shelf`（最初方案为游戏盒货架）
