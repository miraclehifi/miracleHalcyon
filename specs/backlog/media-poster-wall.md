# 电影、剧集改为可翻面、可按时间分段的海报墙

| 字段 | 值 |
|------|-----|
| 状态 | done |
| 类型 | Task |
| 优先级 | P2-Medium |
| 来源 | 作者需求 |
| 日期 | 2026-10-22 |
| 创建者 | miraclehifi |

## 描述

读者端书影音的电影、剧集分类由 `MediaRow` 列表行改为满宽海报墙：

- 排布和入场动画用 [React Bits Masonry](https://reactbits.dev/components/masonry)；
- 每张海报是 [React Bits FlipCard](https://reactbits.dev/micro/flip-card)：悬停显示片名，点击在墙内原地翻到背面看详情；
- 一个"按时间"按钮切换两种排法：不分段（默认），或按"在看 / 本月 / 上个月 / 本年 / 去年 / 更早年份"分段，分段标题吸顶，下缘用 [React Bits GradualBlur](https://reactbits.dev/animations/gradual-blur) 渐变模糊。

三个组件均为 TypeScript + Tailwind 版，上游源码 2026-10-22 取自 React Bits 仓库 `main`，存于 [reactbits-masonry.tsx](../../references/code/reactbits-masonry.tsx)、[reactbits-flip-card.tsx](../../references/code/reactbits-flip-card.tsx)、[reactbits-gradual-blur.tsx](../../references/code/reactbits-gradual-blur.tsx)，实现时 vendor 到 `src/components/vendor/react-bits/`。

## 目标与验收

**目标**: `/media/movie`、`/media/series` 以满宽海报墙展示条目，可切换按时间分段，点海报翻面看详情；书、漫画仍用 `MediaCard`，游戏、桌游仍用 `MediaRow`。

**验收条件**:
- [x] 设计稿 [admin.pen](../ui/admin.pen)：09e（不分段，默认）、09d（按时间分段，含一张翻开、一张悬停）、09d-s（分段标题吸顶 + GradualBlur）、09dm（手机）；组件区 `MediaPoster/Front` · `/Hover` · `/Back`（含暗色示例）、`MediaTimeHeading`、`MediaTimeToggle/On` · `/Off`；09c 改为游戏示例
- [x] [components.md](../ui/components.md)、[reader-media.md](../ui/pages/reader-media.md)、[design-tokens.md](../ui/design-tokens.md)、US-03、F-005 架构文档按本条更新
- [x] 电影、剧集页主体满宽：左右边距桌面 50px、手机 20px（与 `SiteHeader` 对齐）；海报 2:3，容器宽 < 600px 时 2 列，否则按列宽 200 自动（1440 宽为 6 列），间距 16
- [x] 海报正面不显示"在看"徽标；悬停（及键盘聚焦）时底部浮出片名，样式同 Masonry caption
- [x] 点击、Enter 或空格把海报翻到背面：片名、评分、短评、"看过 · yyyy-MM-dd"（进行中为"在看"徽标），不显示导演；再点翻回；同一时间只翻开一张；Esc 翻回
- [x] 背面底色亮色 `#FFFFFF`、暗色 `#27272A`，文字暗色 `#F5F5F5`（同 FlipCard 示例的 `background` / `color`），悬停时有跟随指针的反光
- [x] 有豆瓣链接时背面右下角"豆瓣 ↗"新标签页打开；正面时它不可点、不可聚焦
- [x] "按时间"按钮默认关闭，选择记在浏览器里（`localStorage`）；打开后按当天日期分段，空段不显示；分段标题吸顶，下缘 GradualBlur
- [x] 无 JS 时输出静态网格（不分段），条目完整在 HTML 中；有 JS 时由海报墙接管并播放入场，不出现静态网格闪一下
- [x] `prefers-reduced-motion` 时无入场位移 / 模糊、翻面直接切换、悬停片名无位移
- [x] 不新增 npm 依赖（Masonry 的 hugeicons 换成 `lucide-react`；FlipCard 用已有的 `motion`；GradualBlur 无依赖）
- [x] 读者页的 React 岛只有 `MediaTypeTabs` 与电影、剧集页的 `MediaPosterWall`

## 影响分析

- **影响范围**:
  - UI：`components.md`（`MediaPoster`、`MediaTimeHeading`、`MediaTimeToggle`、`MediaPosterWall`，"海报墙参数"；`MediaRow` / `MediaList` 使用范围）、`reader-media.md`、`design-tokens.md`（`flip-surface`、`flip-ink`，海报墙视觉例外）、`admin.pen`
  - 产品 / 测试：US-03 `story.md` AC4、AC12、AC13；`behaviors.md` BH-06、BH-17 改口径，新增 BH-19、BH-20；`US-03-tests.md` TC-US03-06、11 改口径，新增 TC-US03-19、20；`frontend-unit-tests.md` 新增 UT-15、UT-16
  - 工程：F-005 `feature-architecture.md`（组件表、页面树）、ADR-012"零 JS"加注；reader `module-spec.md` 新增 `groupByTime`
  - 任务：Sprint 9 新增任务 10 `add-media-poster-wall`（依赖任务 8）；任务 8 的电影、剧集先按 `MediaRow` 实现，由任务 10 替换
- **依赖项**: 无新 npm 依赖
- **决策**（2026-10-22，作者在对话中逐项选定或指示；其余为 AI 设计，按作者偏好文档阶段不逐项确认）:

| 项 | 决定 | 来源 |
|----|------|------|
| 翻面位置 | 墙内原地翻，不做"弹出放大再翻" | 作者选 |
| 范围 | 电影 + 剧集；游戏、桌游封面比例不一，仍用列表行 | 作者选 |
| 时间分段 | 分段时间线（而不是筛选器），只用于海报墙 | 作者选 |
| 切换按钮 | 有按钮决定是否按时间展示；关闭时为不分段的 Masonry 墙 | 作者指示 |
| 宽度 | 两种排法都铺满屏幕，左右不留白 | 作者指示 |
| 正面 | 不要"在看"徽标；悬停只显示片名 | 作者指示 |
| 背面 | 不显示导演；日期精确到日；底色与示例一致（亮白、暗 `#27272A`） | 作者指示 |
| 结构 | 给 vendor 的 Masonry 加 `renderTile`，砖块内容交给 `MediaPoster`；关闭 Masonry 的灯箱、拖动排序、内置悬停与标题浮层（悬停片名由 `MediaPoster` 按 Masonry caption 样式自己画） | AI |
| 豆瓣链接 | 不放进 FlipCard 内部（根节点是 `role="button"`，嵌链接属于交互元素嵌套），作为兄弟节点覆盖在背面右下角 | AI |
| FlipCard 拖动 | 关闭（`draggable={false}`）：海报墙里横向拖动易与滚动、误触冲突 | AI |
| 分段计算 | 在浏览器按当天本地日期计算（页面构建时预渲染，构建时写死会过期）；无 JS 不分段 | AI |
| 按钮默认值 | 关闭；`localStorage` 记住读者选择（只是个人偏好，读不到时按关闭） | AI |
| 标题区 | 电影、剧集页的标题、计数、分类标签也随之满宽（与海报墙左缘对齐）；代价是从其他分类切过来时标签位置从居中变为靠左 | AI |
| 按钮位置 | 桌面在分类标签行右端；手机在标题行右侧（计数旁），分类标签行放不下 | AI |

## 估算

- **规模**: M

## 备注

- F-005 处于 implementation，任务 8 未开始；本条先改规格、设计稿与任务，代码由任务 10 实现
