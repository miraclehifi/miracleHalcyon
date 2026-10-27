# add-game-poster-wall: 游戏海报墙（原比例封面、悬停显示平台、翻面）

**Sprint**: Sprint 9
**序号**: 14
**状态**: completed（2026-10-27）
**类别**: FRONTEND
**架构层级**: 表现层（reader：`src/components/reader/`、`src/lib/reader/`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [game-case-shelf](../../backlog/game-case-shelf.md)

## 意图声明

- **改动意图**:
  - `shelf.ts` 新增 `posterAspect(type, cover)`；`shelf-time.ts` `groupByTime` 对游戏用"在玩"、量词"款"
  - 新建 `PlatformBadge.tsx`（高 22 胶囊，Simple Icons 官方路径内联 SVG：PlayStation / Nintendo Switch / Steam；`aria-label="平台：…"`）
  - `MediaPoster` 加游戏模式：正面不渲染名称浮层与底部渐变，悬停 / 聚焦时左上角淡入 `PlatformBadge`（`hover: none` 时不显示，`aria-hidden`）；背面不显示平台；`<img>` 带 `width` / `height`、`object-fit: contain`；翻面控件 `aria-label="《名称》，PS5，2024"`（悬停年份徽标与"按发行年份"分段见任务 15）
  - `MediaPosterWall`：砖块高 = 列宽 ÷ `posterAspect`；静态网格用 `style="aspect-ratio: …"`；封面加载失败保持砖块尺寸切换占位
  - `MediaList`：`game` 改为 `<MediaPosterWall client:load>`，页面满宽同电影；来源说明游戏页加"封面来自 IGDB"
  - 构建夹具 `reader-fixture.shelf.json`：游戏改为 5 条 IGDB 条目、桌游 2 条、漫画清空（[US-03-tests](../../test/features/F-005-书影音/acceptance/media-shelf/US-03-tests.md)"测试数据"）；E2E 夹具图片 `tests/fixtures/igdb/`
- **影响范围**: `/media/game` 产物多一个岛、主体满宽；电影、剧集海报墙共用组件（电影模式行为不变）；桌游仍为 `MediaRow`；构建夹具调整波及 TC-US03-03、05、06、10、11、16、17
- **不变量**: 电影、剧集正面不浮出片名（任务 18 已去掉）、无徽标；不请求豆瓣域名；站外图片只允许 images.igdb.com 且只在游戏页；不新增 npm 依赖
- **不在本任务**: 接口字段（任务 12）；后台表单（任务 13）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-03](../../product/features/F-005-书影音/stories/media-shelf/US-03-media-page/story.md) AC4、AC13、AC14；BH-06、16、17、20、21、22 |
| 设计依据 | [reader-media.md](../../ui/pages/reader-media.md)"游戏海报墙" · [components.md](../../ui/components.md) `MediaPoster`、`PlatformBadge` · admin.pen 09f、组件区"读者端区块" Row 7（各平台悬停、"游戏卡片翻面交互"） · [ADR-013](../../engineering/features/F-005-书影音/architecture/adr/ADR-013-game-cover-igdb-link.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | UT-17 `posterAspect`、UT-15 游戏量词与"在玩"——`tests/unit/reader/shelf.test.ts`、`tests/unit/reader/shelf-time.test.ts` | 单元 |
| 2 | UT-18 `PlatformBadge` 与 `MediaPoster` 游戏模式（jsdom）——`tests/unit/reader/media-poster-wall.test.tsx` | 单元 |
| 3 | TC-US03-21（新增）及 TC-US03-03、06、10、11 改口径——`tests/build/reader-output.test.ts` | 构建 |
| 4 | TC-US03-22、TC-US03-23（`page.route` 拦截 images.igdb.com）——`tests/e2e/reader-media.spec.ts` | E2E |
| 5 | TC-US03-16、17 改口径（漫画空状态、桌游行、游戏 2 列）——同文件 | E2E |

## DoD（完成定义）

- [x] 页面与 admin.pen 09f、Row 7 一致：1440 宽 6 列、390 宽 2 列；砖块宽高比与大图一致（±1%），不裁切；五种平台徽标正确；翻面背面有平台、无开发商
- [x] 测试清单全部由红变绿；影响范围：`tests/build/reader-output.test.ts` 原有用例、`tests/e2e/reader-media.spec.ts` 电影 / 剧集用例（TC-US03-19、20）chromium 通过，本任务 E2E 补跑 webkit
- [x] 未引入新依赖（`git diff package.json` 为空）

## 依赖

12（`GET /api/shelf` 的 `platform`、宽高）、10（海报墙）

## 影响的文件

- `src/components/reader/PlatformBadge.tsx`（新建）、`MediaPoster.tsx`、`MediaPosterWall.tsx`、`MediaList.astro`、`MediaPage.astro`（改）
- `src/lib/reader/{shelf,shelf-time,types}.ts`（改）
- `tests/unit/reader/{shelf,shelf-time}.test.ts`、`tests/unit/reader/media-poster-wall.test.tsx`、`tests/build/reader-output.test.ts`、`tests/e2e/reader-media.spec.ts`、`tests/fixtures/reader/reader-fixture.shelf.json`（改）、`tests/fixtures/igdb/*`（与任务 12 共用）

## 实现记录（2026-10-27）

- `posterAspect(type, cover)` 与 `isPosterType(type)`（movie / series / game）在 `shelf.ts`；`groupByTime` 进行中段标签改用 `statusLabel`（游戏"在玩"、书"在读"）
- `PlatformBadge.tsx` 内联 Simple Icons 官方路径（playstation / nintendoswitch / steam，取自 jsdelivr `simple-icons@latest`），`role="img"` + `aria-label`
- `MediaPoster`：根节点加 `group`；平台浮层 `[data-poster-hover]` 用 `group-hover`（Tailwind 4 的 hover 变体自带 `@media (hover: hover)`）与 `pointer-fine:group-has-focus-visible` 淡入；翻面控件名 `《名称》，PS5，2024`（年份徽标在任务 15）
- 夹具：漫画清空后，原"超长标题 + 多行短评"漫画条目无处安放（其他分类条数已定），多行短评移到"无评桌游"，TC-US03-13 暂只测转义，超长标题与多行短评在任务 16（全部海报墙）补回
- E2E 新增 IGDB 夹具 `co5vmg-811x1080.jpg`、`cobg300-600x900.jpg`（sharp 纯色图）；悬停时 FlipCard 倾斜放大，徽标位置改断言计算样式 `left` / `top` = 10px；触屏用例在 WebKit 跳过（Windows 版不支持 `isMobile`）

## 回滚策略

`MediaList` 的 `game` 分支改回 `MediaRow`；删除 `PlatformBadge.tsx`；`MediaPoster` / `MediaPosterWall` / 夹具 git 还原

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| reader-media.md、components.md（`MediaPoster`、`PlatformBadge`）、reader module-spec §2 | 标注已实现 |
| [game-case-shelf](../../backlog/game-case-shelf.md) | 勾选验收条件，全部勾完后状态 → done |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
