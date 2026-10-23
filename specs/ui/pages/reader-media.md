# 书影音（Reader Media）

**路由**: `/media`（书）、`/media/:type`（`comic` / `movie` / `series` / `game` / `boardgame`）
**状态**: draft（已实现：Sprint 9 任务 8 页面框架、任务 10 电影 / 剧集海报墙；书、漫画、桌游改海报墙与游戏海报墙待实现，[media-wall-all-types](../../backlog/media-wall-all-types.md)、[game-case-shelf](../../backlog/game-case-shelf.md)）
**关联**: F-005 · US-03 · [Backlog](../../backlog/media-douban-sync.md)

## 页面用途

读者按分类浏览作者读过、看过、玩过以及正在进行的条目。只读、构建时预渲染，参考 [pseudoyu · Media](https://www.pseudoyu.com/media?type=book)。

## 路由决定

| 项 | 决定 | 理由 |
|----|------|------|
| 分类切换 | 每个分类一个预渲染页：`/media` = 书，其余 `/media/{type}`；分类标签是链接，由 `MediaTypeTabs` 岛（GooeyNav）播完水滴动画后整页跳转，无 JS 时是普通链接 | 每页只含一个分类的条目，HTML 体积随分类拆开；可直接分享分类地址；React 岛只有分类导航与海报墙（[gooey-media-tabs](../../backlog/gooey-media-tabs.md)、[media-poster-wall](../../backlog/media-poster-wall.md)，原为零 JS） |
| `/media/book` | 不生成，`/media` 即书 | 避免同一内容两个地址 |
| 未知分类（如 `/media/music`） | 站点 404 页 | 静态路由，未生成即 404（US-03 BH-14 取路径路由分支） |
| 分页 | 不做 | 单分类数百条量级；封面 `loading="lazy"` |
| 按时间分段 | 所有分类都有，由读者用"按时间"按钮开关，默认关闭；分段在浏览器按当天日期计算，不写进 URL | 页面构建时预渲染，构建时写死"本月 / 上个月"会过期 |

## 入口与出口

| 从哪来 | 去哪里 |
|--------|--------|
| 读者顶栏"书影音"（`SiteNav current="media"`，所有 `/media*` 页高亮） | 条目有豆瓣链接时：翻到背面后点"豆瓣 ↗"→ 豆瓣条目页（新标签页） |
| 直接访问分类地址 | 底部 `> cd ..` → `/` |

## 布局（所有分类相同，设计稿 09 / 09c / 09e / 09d / 09f / 09g）

```
┌ SiteHeader（书影音高亮）──────────────────────────────────────────────┐
  书影音                                                    86 部 · 在看 1
  书  漫画 [电影] 剧集  游戏  桌游                  [📅 按时间][看过时间|上映年份]
  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐
  │海││海││背││海││海││海│   ← MediaPosterWall：6 列（1440 宽），点海报原地翻面
  └──┘└──┘└──┘└──┘└──┘└──┘
  …
  只收录读过、看过、玩过和正在进行的条目，条目信息来自豆瓣。
  > cd ..
└ SiteFooter ───────────────────────────────────────────────────────────┘
```

主体满宽，左右边距 50px（与 `SiteHeader` 的站点名、导航对齐），标题、分类标签、海报墙都左对齐到这条边；**所有分类同一版式**，没有居中的 896px 窄栏（2026-10-23 [media-wall-all-types](../../backlog/media-wall-all-types.md)，书、漫画原为 `MediaCard` 两列网格，桌游原为 `MediaRow` 列表）。

| 区域 | 内容 |
|------|------|
| `MediaHeader` | 左："书影音"（32px 600）；右：当前分类计数，14px `ink-muted`，格式见下表"计数文案"；手机端计数右侧挂"按时间"槽 |
| `MediaTypeTabs` | 6 个 `MediaTypeTab`，`/Selected` 反色胶囊为当前分类；每项是 `<a href>`，当前项 `aria-current="page"`。点击其他分类：胶囊碎成水滴飞向新项（约 600ms）后跳转；Ctrl / ⌘ / Shift / 中键点击按浏览器默认处理；减弱动效时立即跳转。参数见 [components.md](../components.md)"分类导航参数"。桌面端这一行右端挂 `MediaTimeToggle`（打开时右侧再出 `MediaTimeBasis`） |
| `MediaList` | 所有分类都是 `MediaPosterWall`（见"海报墙"）；空分类为 `EmptyState` |
| 来源说明 | 13px `ink-faint`："只收录读过、看过、玩过和正在进行的条目，条目信息来自豆瓣。"；游戏页为"…条目信息来自豆瓣，封面来自 IGDB。"（IGDB 使用条款要求注明来源） |
| `BackLink` | `> cd ..` → `/` |

### 计数文案

| 分类 | 量词 | 进行中动词 | 示例 |
|------|------|-----------|------|
| 书、漫画 | 本 | 在读 | `128 本 · 在读 2` |
| 电影、剧集 | 部 | 在看 | `86 部 · 在看 1` |
| 游戏、桌游 | 款 | 在玩 | `12 款` |

进行中数为 0 时不显示"· 在X 0"。只计显示中的条目（隐藏不计）。

### 排序

进行中的条目在前；同组内按标记日期倒序；同日按创建时间倒序。海报墙不分段时同此顺序；分段时段内同此顺序。

## 海报墙（所有分类）

参数见 [components.md](../components.md)"海报墙参数"。

| 项 | 表现 |
|----|------|
| 排布 | Masonry 等宽列，间距 16；容器宽 < 600px 时 2 列，否则按列宽 200 自动（1440 宽 6 列）；滚到时自下而上依次弹入（模糊转清晰） |
| 正面 | 只有封面，不显示"在读 / 在看 / 在玩"等徽标 |
| 悬停 | 海报朝指针轻微倾斜、放大 1.02，跟随指针的反光；**不浮出名称**（名称只在背面，2026-10-23 去掉[poster-no-hover-title](../../backlog/poster-no-hover-title.md)）；触屏无悬停。**游戏例外**，见"分类差异" |
| 翻面 | 点击、Enter 或空格：绕 Y 轴翻到背面——名称、评分、短评、"读过 / 看过 / 玩过 · 2026-10-14"（手机只显示日期；进行中为"在读 / 在看 / 在玩"徽标）；**不显示作者 / 导演 / 开发商**，游戏也不显示平台。再点翻回。同一时间只翻开一张，翻另一张时前一张自动翻回；Esc 翻回 |
| 背面尺寸 | 与正面相同；短评占满剩余高度后省略 |
| 背面底色 | 亮色白底、暗色 `#27272A` 底（令牌 `flip-surface` / `flip-ink`，同 FlipCard 示例）；有封面时底层铺同一张封面：水平镜像、灰度、不透明度 30%，再叠 `flip-surface` 自上而下 60% → 0%（35% 处）→ 90% 渐变，同 FlipCard 官网示例背面（[poster-back-filtered-cover](../../backlog/poster-back-filtered-cover.md)）；无封面 / 加载失败为纯色底 |
| 豆瓣链接 | 只在背面右下角出现"豆瓣 ↗"（新标签页）；正面不可点、不可聚焦；无豆瓣链接不显示。整张海报不是链接（点击用于翻面） |
| 无封面 / 加载失败 | 正面为占位底（`surface-sunken`）+ `image-off` + 名称，`role="img"` `aria-label="图片不可用"`；游戏悬停仍浮出平台与年份，仍可翻面；砖块尺寸不变 |
| 无 JS | 静态网格（不分段，CSS grid，同列宽，每块 `aspect-ratio` 同下表）只显示正面，不能翻面；"豆瓣 ↗"固定显示在海报右下角；没有"按时间"按钮 |
| 减弱动效 | 无入场位移与模糊；翻面直接切换，无旋转；游戏悬停徽标只淡入 |

### 分类差异

| 分类 | 砖块比例 | 封面 | 悬停浮层 | 背面状态词 |
|------|---------|------|---------|-----------|
| 书、漫画 | 2:3，`object-fit: cover` 居中裁切 | 站内 R2 | 无 | 读过 / 在读 |
| 电影、剧集 | 2:3，同上 | 站内 R2 | 无 | 看过 / 在看 |
| 桌游 | **1:1**，同上（桌游盒多为方形） | 站内 R2 | 无 | 玩过 / 在玩 |
| 游戏 | **与 IGDB 大图实际宽高比一致**（`aspect-ratio: {coverWidth} / {coverHeight}`，无封面 3:4），`object-fit: contain`，**不裁切**；`<img>` 带 `width` / `height` | IGDB 外链 `https://images.igdb.com/igdb/image/upload/t_1080p/{图片ID}.jpg`（[ADR-013](../../engineering/features/F-005-书影音/architecture/adr/ADR-013-game-cover-igdb-link.md)） | **不显示名称**、不加底部渐变：左上角（距左 10、距上 10）`PlatformBadge`，右下角（距右 10、距底 10）`YearBadge`（发售年份，只显示数字，无年份不显示），0.2s 淡入 | 玩过 / 在玩 |

游戏的翻面交互示意见组件区 Row 7"游戏卡片翻面交互"（① 默认 → ② 悬停显示平台与年份 → ③ 翻转中 → ④ 背面），09f 中"黑神话：悟空"为翻开态。触屏（`hover: none`）无悬停，游戏的平台与年份都不显示（作者取舍）。

封面地址为站内 R2 路径，**游戏除外**（IGDB 外链）；页面不请求任何豆瓣域名资源。

## 按时间分段（设计稿 09d、09d-s、09g）

读者点 `MediaTimeToggle`（"按时间"）开关：关闭（默认）时整面墙不分段；打开时按钮右侧出现 `MediaTimeBasis` 两项切换，选择分段依据——**标记时间**（默认）或**发行年份**——每段一个 `MediaTimeHeading` + 一面 Masonry 墙。开关与依据记在浏览器 `localStorage` `media:by-time`（`"0"` 关 / `"marked"` / `"release"`；旧值 `"1"` 视为 `"marked"`），所有分类共用，下次打开沿用；读不到时按关闭。切换开关或依据时已翻开的海报翻回（[media-time-basis](../../backlog/media-time-basis.md)）。

| 分类 | 标记时间文案 | 发行年份文案 |
|------|-------------|-------------|
| 书、漫画 | 读过时间 | 出版年份 |
| 电影 | 看过时间 | 上映年份 |
| 剧集 | 看过时间 | 首播年份 |
| 游戏 | 玩过时间 | 发售年份 |
| 桌游 | 玩过时间 | 发行年份 |

### 按标记时间

以浏览器当天本地日期 `today` 为准，条目依次落入第一个满足的段（标记日期 = `markedOn`）：

| 段 | 条件 | 标题 meta（示例：today = 2026-10-22，电影） |
|----|------|------|
| 在读 / 在看 / 在玩 | `status = in_progress`（不论日期） | `1 部` |
| 本月 | 与 `today` 同年同月；以及晚于 `today` 的日期 | `10 月 · 3 部` |
| 上个月 | `today` 的上一个日历月（1 月时为上一年 12 月，归这里而不是"去年"） | `9 月 · 2 部` |
| 本年 | 与 `today` 同年的其余月份 | `2026 · 7 部` |
| 去年 | `today` 年份 − 1 的其余月份 | `2025 · 6 部` |
| 四位年份（如 `2024`） | 更早，每年一段，倒序 | `3 部` |

- 没有条目的段不显示；量词随分类（本 / 部 / 款）
- 分段标题 `position: sticky; top: 0`（顶栏不吸顶），下缘 56px GradualBlur：海报滚到标题下方时逐渐模糊并淡入页面底色（09d-s）；GradualBlur 只在标题吸顶时出现，未吸顶时第一排海报保持清晰（09d）
- 分段标题为 `<h2>`，段与段间距 28，标题与海报间距 16

### 按发行年份

| 段 | 条件 | 标题 meta |
|----|------|------|
| 四位年份（如 `2026`） | 条目 `year` 等于该年；每年一段，倒序（包括晚于今年的年份） | `3 款` / `3 部` / `3 本` |
| 未知年份 | `year` 为空，排在最后 | `1 款` |

- 不出现"在读 / 在看 / 在玩"段；段内进行中的条目在前，其余按标记日期倒序（同 `sortEntries`）
- 吸顶、GradualBlur、`<h2>` 同上

## 条目文本

| 情况 | 表现 |
|------|------|
| 标记日期 | 背面 `yyyy-MM-dd` |
| 名称 | 背面最多 2 行 |
| 短评 | 保留换行；背面占满剩余高度后省略；纯文本转义 |
| 无评分 | 背面不渲染星级 |

## 状态

| 状态 | 表现 | 来源 |
|------|------|------|
| 有条目 | 如布局 | US-03 BH-02、04 |
| 空分类 | 海报墙处显示 `EmptyState`（无按钮）：图标按分类（书 `book-open`、电影 `film`、剧集 `tv`、游戏 `gamepad-2`、桌游 `dices`、漫画 `book-image`），标题"还没有记录{分类}"；计数"0 本 / 部 / 款"；不显示"按时间"按钮 | BH-12 |

无加载态与错误态（静态页）。

## 响应式（< 768px，设计稿 09m、09dm）

| 变化 |
|------|
| `SiteHeader/Mobile`；主体左右 20px（与 `SiteHeader/Mobile` 站点名对齐），所有分类相同 |
| `MediaTypeTabs` 放不下时换行（不横向滚动：GooeyNav 画布外扩 72px，滚动容器会裁掉水滴），水滴可跨行飞行；`<main>` 设 `overflow-x: clip`（不形成滚动容器），防止画布撑出页面横向滚动 |
| 海报墙 2 列（2:3 每张约 167×250，桌游约 167×167，游戏高度随封面比例），背面内边距 12、底部只显示日期；"按时间"与依据切换移到标题行计数右侧 |
| 页面无横向滚动 |

## 可访问性

- 分类导航 `<nav aria-label="书影音分类">`，当前项 `aria-current="page"`
- 星级用 `StarRating/Small`（只读，`role="img"` `aria-label="评分 N / 5"`，星形 SVG `aria-hidden`）
- 海报墙为 `role="list"`，每张海报 `role="listitem"`；翻面控件为 FlipCard 的 `role="button"`（`aria-label="《名称》"`，游戏为 `"《名称》，PS5，2024"`；`aria-pressed` 表示是否翻开），未显示的一面 `aria-hidden`；悬停浮层 `aria-hidden`；"豆瓣 ↗"是控件外的兄弟链接，未翻开时 `tabIndex=-1`
- "按时间"为 `<button aria-pressed>`；依据切换为 `role="radiogroup"`；分段标题为 `<h2>`，读屏可按标题跳段
- 外链文字含标题（`aria-label="在豆瓣查看《名称》（新标签页）"`）

## 组件清单

| 组件 | 类型 | 说明 |
|------|------|------|
| `SiteHeader` / `SiteNav` | 已有 | `current="media"` |
| `MediaHeader` | 已有 | 标题 + 计数 + 手机端按钮槽 |
| `MediaTypeTabs` + `MediaTypeTab/Selected` · `Default` | 已有 | 链接；React 岛（`client:load`），内部渲染 GooeyNav |
| `MediaList` | 页面区块 | 所有分类渲染 `MediaPosterWall`，空分类 `EmptyState` |
| `MediaPosterWall` | 页面区块 | 所有分类；React 岛 `client:load`，底层 React Bits Masonry |
| `MediaPoster/Front` · `/Hover` · `/Back` | 已有，改动 | 底层 React Bits FlipCard；砖块比例按分类；游戏模式悬停显示平台与年份、不显示名称 |
| `PlatformBadge`、`YearBadge` | 新增 | 游戏悬停时的平台（左上）与发售年份（右下） |
| `MediaTimeHeading` | 已有 | 分段标题，下缘 React Bits GradualBlur |
| `MediaTimeToggle/On` · `/Off`、`MediaTimeBasis` | 已有 / 新增 | "按时间"开关与依据切换，由 `MediaPosterWall` 渲染到页面槽位 |
| `EmptyState` | 已有 | 空分类 |
| `BackLink`、`SiteFooter` | 已有 | — |
| ~~`MediaCard`、`MediaRow`~~ | 废弃（2026-10-23） | 书、漫画、桌游改为海报墙后不再使用，设计稿移入存档区 |

除 `MediaTypeTabs`、`MediaPosterWall`（及其内部组件）外，读者端组件为 Astro 组件（不加载 React），与 F-002 读者页一致。

## 设计稿

[admin.pen](../admin.pen)「页面区 · 读者端」：`09 书影音 /media（书；海报墙，同电影）`、`09m 书影音 /media（书 · 移动，海报墙）`、`09c 书影音 /media/boardgame（桌游；海报墙，砖块 1:1）`、`09e 海报墙 · 不按时间（默认）`、`09d 海报墙 · 按时间分段（含一张翻开、一张悬停；工具栏含依据切换）`、`09d-s 分段标题吸顶 + GradualBlur（滚动中）`、`09dm 海报墙（移动）`、`09f 书影音 /media/game（演示五个平台悬停态与一张翻面）`、`09g 书影音 /media/game（按时间 · 发售年份分段）`；组件区"读者端区块" Row 6（海报墙）、Row 7（`PlatformBadge`、`YearBadge`、`MediaTimeBasis`、`MediaPoster/Hover（游戏 · 各平台）`、"游戏卡片翻面交互"）。未采用 / 已废弃方案（实体游戏盒、`GameCard`、`MediaCard`、`MediaRow`）在「存档」区，不实现。

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-23 | 所有分类统一为满宽海报墙：书、漫画（原 `MediaCard` 网格）与桌游（原 `MediaRow` 列表）改用 `MediaPosterWall`，桌游砖块 1:1；"按时间"扩展到所有分类；`MediaCard`、`MediaRow` 废弃；重做 09 / 09m / 09c（[media-wall-all-types](../../backlog/media-wall-all-types.md)） | miraclehifi |
| 2026-10-23 | "按时间"可选标记时间或发行年份；游戏悬停加发售年份、背面去掉平台、平台徽标移到左上角；新增 09g（[media-time-basis](../../backlog/media-time-basis.md)） | miraclehifi |
| 2026-10-23 | 游戏由列表行改为海报墙：封面为 IGDB 外链、保持原比例不裁切，悬停不显示名称、显示平台徽标；09c 改为桌游示例，新增 09f（[game-case-shelf](../../backlog/game-case-shelf.md)） | miraclehifi |
| 2026-10-22 | 电影、剧集改为满宽 Masonry 海报墙：点海报原地翻面（FlipCard）看详情，悬停显示片名，背面不显示导演、日期到日、底色同 FlipCard 示例；"按时间"按钮切换分段时间线（在看 / 本月 / 上个月 / 本年 / 去年 / 更早年份，吸顶标题 + GradualBlur）；新增"海报墙""按时间分段"两节与设计稿 09e / 09d / 09d-s / 09dm，09c 改为游戏示例（[media-poster-wall](../../backlog/media-poster-wall.md)） | miraclehifi |
| 2026-10-22 | 分类导航改用 GooeyNav（React 岛，动画后跳转）；手机端换行代替横向滚动（[gooey-media-tabs](../../backlog/gooey-media-tabs.md)） | miraclehifi |
| 2026-10-21 | 初始版本（F-005 design-ui）：以 2026-10-16 先行稿为起点；分类改为路径路由；非书分类用列表行；补 09c；来源说明改为"条目信息来自豆瓣" | miraclehifi |
