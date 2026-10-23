# 书影音录入表单改为卡片式布局

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-22 |
| 创建者 | miraclehifi |

## 描述

书影音录入 / 编辑页（`/admin/media/new`、`/admin/media/:id`）参考作者在 2026-10-22 对话中提供的 input-modal 组件（shadcn 风格的"Create Your Audio Show"弹窗）调整版式：表单收进一张卡片，卡片头部是图标块 + 标题 + 说明，识别区带标签、可识别类型小卡片和识别结果预览卡，字段按两列网格排列，底部操作栏在卡片内、上方有分隔线。

2026-10-22 追加：输入框质感参考 Aceternity UI signup-form（源码存于 [references/code/aceternity-signup-form.tsx](../../references/code/aceternity-signup-form.tsx)），作用于全后台 `Field` 与 `RecognizeBox` 输入框。

只借鉴视觉与布局，不引入 shadcn / Radix / lucide-react 依赖，不新建 `components/ui` 目录；控件继续用 [components.md](../ui/components.md) 中已有组件（`Field`、`Button/*`、`SegmentedItem`、`StarRating`）。

## 目标与验收

**目标**: 录入表单的层次更清楚：先识别，再看条目信息，最后填自己的记录；桌面与手机的阅读顺序一致。

**验收条件**:
- [x] admin.pen `11`、`11m`、`11b` 与组件 `RecognizeBox` 按新版式更新，`11b` 各状态实例仍正确
- [x] [admin-media.md](../ui/pages/admin-media.md) §二 布局、`RecognizeBox`、响应式按新版式改写
- [x] [components.md](../ui/components.md) `RecognizeBox` 描述同步（标签、来源卡片、结果预览卡）
- [x] [design-tokens.md](../ui/design-tokens.md) 新增"输入框质感"；admin.pen 组件 `Field` 标签 `ink`、间距 8、输入框轻投影，`RecognizeBox` 输入框同质感；11 底部分隔线渐隐、区块标题细线渐隐；11b 加悬停光晕示意
- [x] Sprint 9 任务 5（`add-admin-media-form`）、任务 6（`add-recognize-box`）的设计依据指向新版式

## 影响分析

- **影响范围**:
  - UI：`specs/ui/admin.pen`（11、11m、11b、组件区 `RecognizeBox`）、`specs/ui/pages/admin-media.md` §二、`specs/ui/components.md`（`RecognizeBox`）
  - 任务：Sprint 9 任务 5、6 只改设计依据说明，测试清单不变
  - 代码：`src/components/ui/Field.tsx`（共享组件，波及登录页、`PostSettingsDrawer`、`TagInput`），并入 Sprint 9 任务 5 实现；任务 5 / 6 验收项已补
  - 产品 / 测试：无。行为（识别、校验、保存）不变，BH / TC 不改
- **设计稿**: 见上
- **依赖项**: 无新 npm 依赖
- **决策**（2026-10-22，AI 按作者需求设计，作者偏好文档阶段不逐项确认）:
  - 借鉴项：卡片容器、卡片头部图标块、带标签的识别输入、可识别类型小卡片（书 / 漫画 / 电影 / 剧集 / 游戏 / 桌游，2026-10-22 作者要求去掉"豆瓣读书"等来源字样）、识别结果预览卡（缩略图 + 标题 + 已识别 / 未识别）、两列字段网格、卡片内底部操作栏
  - 不借鉴：弹窗形态与右上角关闭（这是整页，已有"← 书影音"和"取消"）；顶部来源 Tab（只有豆瓣一种来源，做成 Tab 是假选择）；48px 高输入框（`Field` 是全后台共用组件，单页加大会和文章页不一致）
  - Aceternity 借鉴项（2026-10-22）：输入框轻投影、`accent` 悬停光晕（光标跟随，只在外圈 2px 露出）、标签加深为 `ink`、两端渐隐分隔线。不借鉴：去掉描边（`input-border` 3:1 边界对比度要保住）、渐变主按钮与悬停底部亮线（已有 SpecularButton）、第三方登录按钮。高度不变（不加大到 40px，理由同上）
  - 光晕与识别高亮用 `accent`；同日全站 `accent` 改为蓝色（[restyle-blue-accent](restyle-blue-accent.md)），故与 Aceternity 色调一致
  - 手机：不画卡片边框和阴影（屏幕窄，卡片只会挤占宽度），保留头部图标块和区块顺序；类型小卡片隐藏（同原来隐藏底栏说明）

## 估算

- **规模**: S

## 备注

- F-005 处于 implementation，任务 5、6 未开始，本条只改设计与规格，代码随这两个任务实现
- 2026-10-22 完成：设计与规格此前已落地（未勾选），代码随 Sprint 9 任务 5（`Field` 输入框质感、表单卡片版式）实现；`RecognizeBox` 的输入框质感随任务 6
