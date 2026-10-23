# add-media-poster-wall: 电影、剧集海报墙

**Sprint**: Sprint 9
**序号**: 10
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（reader：`src/components/reader/`、`src/components/vendor/react-bits/`、`src/lib/reader/`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-poster-wall](../../backlog/media-poster-wall.md)

## 意图声明

- **改动意图**:
  - vendor 三个组件到 `src/components/vendor/react-bits/`，文件头写上游来源与改动清单：
    - `Masonry.tsx`（自 [reactbits-masonry.tsx](../../../references/code/reactbits-masonry.tsx)）：加 `renderTile`、hugeicons 换 lucide、导出 `CAPTION` / `TITLE`、透传 `data-*`
    - `FlipCard.tsx`（自 [reactbits-flip-card.tsx](../../../references/code/reactbits-flip-card.tsx)）、`GradualBlur.tsx`（自 [reactbits-gradual-blur.tsx](../../../references/code/reactbits-gradual-blur.tsx)）：无行为改动
  - 纯函数 `src/lib/reader/shelf-time.ts` `groupByTime`（规则见 reader module-spec §2）
  - 新建 `MediaPoster.tsx`（正面封面 + 悬停片名；背面片名、评分、短评、`yyyy-MM-dd`，不显示导演；兄弟节点"豆瓣 ↗"）、`MediaTimeHeading.tsx`（吸顶 `<h2>` + GradualBlur）、`MediaTimeToggle.tsx`、`MediaPosterWall.tsx`（量容器宽定列数；受控"当前翻开 id"、Esc 翻回；`localStorage` `media:by-time`；按钮经 `createPortal` 挂到 `[data-time-toggle-slot]`；服务端 / 水合前渲染 `[data-poster-static]` 静态网格，挂载后换 Masonry）
  - `MediaList` 对 `movie` / `series` 改为 `<MediaPosterWall client:load>`；电影、剧集页主体满宽（左右 50px，手机 20px），`MediaHeader` 与分类标签行加按钮槽
  - `BaseLayout` `<head>` 内联脚本加 `document.documentElement.dataset.js = ""`；全局 CSS：`html[data-js] [data-poster-static] { visibility: hidden }`、`html:not([data-js])` 时"豆瓣 ↗"常显
  - `tokens.css` 的 `flip-surface`、`flip-ink` 已在任务 4 中提前补上（令牌一致性测试要求与 [design-tokens.md](../../ui/design-tokens.md) 同步），本任务直接使用
- **影响范围**: `/media/movie`、`/media/series` 构建产物多一个岛、主体变满宽；`BaseLayout` 改动波及所有读者页与后台页（只加一个 data 属性）；`tokens.css` 新增两个令牌
- **不变量**: 书、漫画、游戏、桌游页不变；岛只有 `MediaTypeTabs` 与本岛；不请求豆瓣域名；不新增 npm 依赖
- **不在本任务**: 弹出放大式详情；拖动排序；其他分类按时间分段

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-03](../../product/features/F-005-书影音/stories/media-shelf/US-03-media-page/story.md) AC4、AC12、AC13；BH-06、BH-17、BH-19、BH-20 |
| 设计依据 | [reader-media.md](../../ui/pages/reader-media.md)"海报墙""按时间分段" · [components.md](../../ui/components.md) `MediaPoster`、`MediaTimeHeading`、`MediaTimeToggle`、`MediaPosterWall`、"海报墙参数" · [design-tokens.md](../../ui/design-tokens.md)"海报墙" · admin.pen 09e / 09d / 09d-s / 09dm、组件区"读者端区块" Row 6 |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-15 `groupByTime`（`tests/unit/shelf-time.test.ts`） | 单元 |
| 2 | UT-16 海报墙交互（`tests/unit/media-poster-wall.test.tsx`，jsdom，打桩 `ResizeObserver` / `IntersectionObserver`） | 单元 |
| 3 | TC-US03-11（改口径：电影 / 剧集页有且只有一个海报墙岛，静态网格含全部条目的标题、短评、`yyyy-MM-dd`、豆瓣链接且不含导演；书 / 游戏页无该岛）、TC-US03-06（改为游戏行；夹具 `.shelf.json` 加两条游戏）——扩展 `tests/build/reader-output.test.ts` | 构建 |
| 4 | TC-US03-19（悬停片名、翻面、只翻一张、Esc、Enter、豆瓣新标签、减弱动效、暗色背面）、TC-US03-15 海报墙部分（"无名片"封面 404 → 正面占位 + 片名）——`tests/e2e/reader-media.spec.ts` | E2E |
| 5 | TC-US03-20（`page.clock` 固定 2026-09-15：默认不分段、开关、刷新保留、吸顶、手机按钮位置与 2 列）——同文件 | E2E |

## DoD（完成定义）

- [x] 页面与 admin.pen 09e / 09d / 09d-s / 09dm 一致：1440 宽 6 列、390 宽 2 列；亮暗主题下背面底色 / 文字随 `flip-surface` / `flip-ink` 切换
- [x] vendor 文件头写明上游来源与改动清单
- [x] 测试清单全部由红变绿；影响范围：`tests/build/reader-output.test.ts` 原有用例、`tests/e2e/` 读者端 spec（`reader-*`）chromium 通过（`BaseLayout` 改动波及全站，跑一次读者端 + 后台登录页 E2E）
- [x] `npm ls @hugeicons/react` 为空（未引入新依赖）

## 依赖

8（读者页、`MediaList`、夹具）

## 影响的文件

- `src/components/vendor/react-bits/{Masonry,FlipCard,GradualBlur}.tsx`（新建）
- `src/components/reader/{MediaPoster,MediaTimeHeading,MediaTimeToggle,MediaPosterWall}.tsx`（新建）、`MediaList.astro`、`MediaHeader.astro`、`src/pages/media/[type].astro`（改）
- `src/lib/reader/shelf-time.ts`（新建）
- `src/layouts/BaseLayout.astro`、`src/styles/tokens.css`、全局样式（改）
- `tests/unit/shelf-time.test.ts`、`tests/unit/media-poster-wall.test.tsx`（新建）、`tests/build/reader-output.test.ts`、`tests/e2e/reader-media.spec.ts`、构建夹具 `.shelf.json`（改）

## 回滚策略

删除新文件；`MediaList` 的电影 / 剧集分支改回 `MediaRow`、页面主体恢复 896px；`BaseLayout`、`tokens.css` 与样式 git 还原

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| reader-media.md、components.md（`MediaPoster`、`MediaTimeHeading`、`MediaTimeToggle`、`MediaPosterWall`） | 标注已实现 |
| reader module-spec §2 `groupByTime` | 标注已实现 |
| [media-poster-wall](../../backlog/media-poster-wall.md) | 勾选验收条件，全部勾完后状态 → done |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
