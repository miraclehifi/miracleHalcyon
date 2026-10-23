# 打星组件改为表情星（参考 Stars rating animation）

| 字段 | 值 |
|------|-----|
| 状态 | scheduled |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-22 |
| 创建者 | miraclehifi |

## 描述

书影音录入表单的打星组件（原 `RatingInput`，改名 `StarRating`）参考 CodePen "Stars rating animation"（aaroniker，源码已存 [references/code/stars-rating-animation](../../references/code/stars-rating-animation/)）：5 颗圆角星各带表情（难过 → 开心），累计点亮前 N 颗，切换时高光从旧星滑到新星并果冻回弹，4 / 5 星有弹跳和光点。

2026-10-22 追加（作者）：不要"清除"按钮；读者端星级展示也用这个组件。

## 目标与验收

**目标**: 打分有趣味，分值一眼可读（表情 + "N / 5"）。

**验收条件**:
- [x] admin.pen 组件 `StarRating` 改为表情星；11b 加空值与 1–5 星状态；新增变量 `rating-star`、`rating-face`
- [x] [components.md](../ui/components.md) `StarRating` 与新增"评分动效参数"；[admin-media.md](../ui/pages/admin-media.md)"StarRating"；[design-tokens.md](../ui/design-tokens.md) 新令牌与过渡例外
- [x] 去掉"清除"；新增 `StarRating/Small`，读者端 `MediaRow` · `/Mobile`、`MediaCard` · `/Mobile` 及 09 / 09m 全部实例改用它
- [x] 后台列表 `MediaEntryRow` · `/Mobile` 设计稿改用 `StarRating/Small`（评分列宽 80 → 88；手机"作者 · 星级 · 状态 日期"拆为文字 + 星级横排）
- [ ] 读者端代码随 Sprint 9 任务 8（`add-media-reader-page`）实现，验收项已补
- [x] 代码随 Sprint 9 任务 5（`add-admin-media-form`）实现，验收项已补（2026-10-22：`StarRating` 表情星与动效、后台 `MediaEntryRow` 改用 `/Small`）

## 影响分析

- **影响范围**:
  - UI：admin.pen（`StarRating`、11 / 11m 实例、11b）、components.md、admin-media.md、design-tokens.md
  - 代码：`src/components/ui/StarRating.tsx` 未实现（任务 5 新建），无存量代码改动；`src/styles/tokens.css` 加两个令牌
  - 测试：任务 5 的 `star-rating.test.tsx` 键盘 / 取值用例不变；不测动画细节
  - 读者端：`MediaRow` / `MediaCard` 改用 `StarRating size="sm" readOnly`（任务 8，代码未实现）
  - 后台列表 `MediaEntryRow`（任务 4 产出，★☆ 字符）：2026-10-22 作者要求一并替换，并入任务 5（`StarRating` 在任务 5 新建）
  - 产品 / 测试：US-03 AC、BH-07、TC-US03-06、UT-06 由"实心 / 空心字符"改为"前 N 颗点亮、其余占位"；无评分仍不显示星级
- **依赖项**: 无新 npm 依赖（原作的 jQuery 不引入，改写为 React + CSS）
- **决策**（2026-10-22，AI 按作者需求设计）:
  - 累计点亮：打 N 分时前 N 颗为黄色实心星、各带自己的表情，其余灰色占位（2026-10-22 作者纠正：原定"只亮当前一颗"沿用原作，作者要求打分后前面的灰星也显示实心）；滑动高光仍落在第 N 颗
  - 原作无空值：补"未评分"全灰态；从空到有值时不滑动，直接点亮
  - 无"清除"按钮：再点当前星取消评分（键盘同理），回到"未评分"
  - 组件改名 `StarRating`（既输入又展示，"Input" 不再贴切；代码未实现，改名只动文档，历史记录行保留原名）
  - 读者端用 `sm`：16×15、间距 2，总宽 88 恰好等于 `MediaRow` 评分列宽；只读、不水合、无动画；有评分时 5 颗都渲染（未点亮的为灰色占位），无评分不渲染（作者确认）
  - 去掉原设计的悬停预览（原作没有，且会与滑动高光冲突）
  - 尺寸用原作 36×34、间距 16，手机不放大（点击区域靠间距补到 ≥ 44）
  - 颜色：点亮星亮色 `#FACC15`（原作 `#FFED76` 在白底不可辨）、暗色沿用 `#FFED76`；未选中星用 `input-border`（≥ 3:1），原作的"比底色更暗"只在暗色主题成立

## 估算

- **规模**: S
