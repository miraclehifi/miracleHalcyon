# F-005 书影音 — UI 覆盖度

**最后更新**: 2026-10-23

## 涉及页面

| 页面 | 路由 | 规格 | 设计稿 | 改动 |
|------|------|------|--------|------|
| 书影音（读者） | `/media`、`/media/:type` | [reader-media.md](../../pages/reader-media.md) | admin.pen 09（书）/ 09m / 09c（桌游）/ 09e / 09d / 09d-s / 09dm / 09f / 09g（游戏），2026-10-23 起全部为海报墙 | 新增（替换 404；以 2026-10-16 先行稿为起点） |
| 书影音条目（后台） | `/admin/media`、`/admin/media/new`、`/admin/media/:id` | [admin-media.md](../../pages/admin-media.md) | admin.pen 10 / 10m / 11 / 11m / 11g（游戏）/ 11b | 新增 |
| 后台各页顶栏 | `/admin`、`/admin/storage` 等 | [components.md](../../components.md) `AdminHeader` | 组件区 `AdminHeader` · `/Mobile` | 导航加"书影音" |

## Story → 页面 / 组件

| US | AC | 页面区域 | 组件 |
|----|----|---------|------|
| US-01 | AC1 列表与分类 | 列表页标题行、分类、列表 | `AdminHeader`、`PageHeader`、`MediaTypeTabs`、`MediaEntryRow` |
| US-01 | AC2 新增默认值 | 表单 | `MediaEntryForm`、`Field`、`SegmentedItem` |
| US-01 | AC3 保存 + 重建 | 表单底部、列表 | `Button/Primary`、`Toast/Success` |
| US-01 | AC4 校验 | 表单字段 | `Field`（错误态） |
| US-01 | AC5 / AC9 封面上传与更换 | 表单封面区 | `CoverField` 交互（2:3） |
| US-01 | AC6 在读 → 读过 | 表单状态、评分、短评 | `SegmentedItem`、`StarRating` |
| US-01 | AC7 隐藏 | 列表行操作、徽标 | `MediaEntryRow`（隐藏态）、`Toast` |
| US-01 | AC8 删除 | 列表行 / 编辑页 | `ConfirmDialog/Danger`、`Button/GhostDanger` |
| US-01 | AC10 未登录 | 中间件跳转 | — |
| US-01 | AC11 游戏平台与 IGDB 封面 | 表单条目信息区、封面区（11g） | `Field`（select、url）、`MediaEntryForm` 游戏分支 |
| US-01 | 空分类、保存中 / 失败 | 列表、表单 | `EmptyState`、`Toast/Error` |
| US-02 | AC1 识别框 | 表单顶部 | `RecognizeBox` |
| US-02 | AC2–AC5 识别填表 / 部分识别 | 识别结果区、字段高亮 | `RecognizeBox`、`Field`（高亮 / `warn`） |
| US-02 | AC6 失败 | 识别结果区 | `RecognizeBox`（失败态，11b） |
| US-02 | AC7 识别中 | 识别按钮 | `RecognizeBox`（识别中，11b） |
| US-02 | AC8 重复 | 识别结果区"去编辑" | `RecognizeBox`（重复态，11b）、`ConfirmDialog/Default` |
| US-02 | AC9 封面预览 / 下载失败 | 封面区预览、识别结果区"未识别：封面" | `ShelfCoverField`、`RecognizeBox`（11b） |
| US-02 | AC10 改分类 | 分类下拉 | `Field`（select） |
| US-02 | AC11 再次识别 | 清空按钮 | `RecognizeBox` |
| US-03 | AC1–AC3 进入、分类、排序 | 读者页头、分类链接、列表 | `SiteNav`、`MediaHeader`、`MediaTypeTabs`、`MediaList` |
| US-03 | AC4 条目内容 | 海报（所有分类） | `MediaPoster`、`MediaPosterWall`（09、09c、09e、09f） |
| US-03 | AC5 / AC6 豆瓣外链 / 不可点 | 卡片 / 行 | `MediaCard`、`MediaRow` |
| US-03 | AC7 隐藏 | 构建数据过滤 | — |
| US-03 | AC8 封面占位 | 卡片 / 行封面 | `MediaCard`、`MediaRow`（失败态） |
| US-03 | AC9 空分类 | 列表 | `EmptyState`（无按钮） |
| US-03 | AC10 手机 | 09m | `/Mobile` 各组件 |
| US-03 | AC11 重建 | — | — |
| US-03 | AC12 / AC13 海报墙翻面、按时间 | 电影、剧集、游戏页 | `MediaPosterWall`、`MediaPoster`、`MediaTimeHeading`、`MediaTimeToggle` |
| US-03 | AC14 游戏海报墙 | 09f、组件区 Row 7 | `MediaPoster`（游戏模式）、`PlatformBadge` |
| US-04 | AC1 入口与 ID | 列表页"从豆瓣导入"、弹窗 ID 输入 | `Button/Outline`、`DoubanImportDialog`（11i 输入） |
| US-04 | AC2、AC7 进度与汇总 | 弹窗进度区、汇总与失败列表 | `DoubanImportDialog`（11i 进行中 / 完成） |
| US-04 | AC3–AC6 导入字段与覆盖 | 无界面（导入后体现在列表） | `MediaEntryRow` |
| US-04 | AC8–AC10 重试、错误、停止 | 弹窗错误提示、"停止" | `DoubanImportDialog`（11i 错误 / 进行中）、`Alert/Error` |
| US-04 | AC11、AC12 同步新标记（增量） | 弹窗"上次同步"、"同步新标记" / "全量导入"按钮、增量进度 | `DoubanImportDialog`（11i 首次 / 已同步过 / 进行中 / 完成） |

## 覆盖结论

三个 US 的全部 AC 都有界面承载。新增组件 3 个（`MediaEntryRow` 含 `/Mobile`、`RecognizeBox`、`StarRating`）、页面区块 1 个（`MediaEntryForm`）；改动 `AdminHeader`、`MediaRow`、`MediaCard`、`MediaTypeTabs`；其余复用。

## design-ui 决定（对验收规格的影响）

| 决定 | 影响 |
|------|------|
| 读者页分类为路径路由 `/media`、`/media/:type`，未知分类 404 | US-03 TC-02、09、13、18 中的 `{分类地址}` 定为路径；TC-09 取 404 分支；TC-18 取链接语义（`aria-current="page"`） |
| 所有分类都是海报墙（2026-10-23 书、漫画、桌游也改，`MediaCard`、`MediaRow` 废弃） | US-03 TC-05、06、07、13、17 按海报墙断言 |
| 后台表单为独立页 `/admin/media/new`、`/admin/media/:id` | US-01 / US-02 E2E 的"打开表单"即跳转该页 |
| 封面统一 2:3 居中裁切；游戏例外，保持 IGDB 大图原比例不裁切 | US-03 TC-21、22 断言游戏砖块比例 |

## 可用性自查

- 用词：界面只用"识别""豆瓣链接""读过 / 在读"等，不出现条目 ID、R2、Deploy Hook；"读者页将在重建后更新"说明延迟
- 识别而非回忆：重复提示直接给出已有条目的标题与状态，并给"去编辑"入口
- 信息最小化：列表不显示短评、豆瓣链接；表单把"条目信息"和"我的记录"分开，识别只碰前者
- 容错：识别失败不清空表单；删除二次确认；离开未保存表单确认；封面下载失败只影响封面一项，可手动上传
