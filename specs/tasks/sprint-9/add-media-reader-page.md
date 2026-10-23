# add-media-reader-page: 读者页 /media

**Sprint**: Sprint 9
**序号**: 8
**状态**: completed
**类别**: FRONTEND
**架构层级**: 表现层（reader：`src/pages/media/`、`src/components/reader/`）
**所属 Feature**: [F-005 书影音](../../product/features/F-005-书影音/feature-scope.md)
**来源 PBI**: [media-douban-sync](../../backlog/media-douban-sync.md)

## 意图声明

- **改动意图**: `src/pages/media/index.astro`（书）、`src/pages/media/[type].astro`（`getStaticPaths` 6 类），`prerender = true`，`SiteHeader current="media"`；Astro 组件 `MediaHeader`、`MediaList`、`MediaCard`（`/Mobile` 响应式）、`MediaRow`（同）、复用任务 4 的 `MediaTypeTabs`（`client:load`，`items` 为 `/media`、`/media/{type}`）；有豆瓣链接为 `<a target="_blank" rel="noopener noreferrer">`，无则非链接；封面 `loading="lazy"`、2:3 cover、内联 `onerror` 切换占位；`EmptyState`（无按钮，按分类图标）；来源说明；`BackLink`
- **影响范围**: 读者端构建产物新增 7 个页面；`SiteNav` 已支持 `current="media"`
- **不变量**: 除 `MediaTypeTabs` 岛外不引用 React 运行时（[gooey-media-tabs](../../backlog/gooey-media-tabs.md)）；不请求豆瓣域名；`/media/book` 与未知分类 404
- **不在本任务**: 电影、剧集海报墙（任务 10 [add-media-poster-wall](add-media-poster-wall.md)；本任务电影、剧集先按 `MediaRow` 实现，任务 10 替换）

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-03](../../product/features/F-005-书影音/stories/media-shelf/US-03-media-page/story.md) AC1–AC11；BH-01–BH-17 |
| 设计依据 | [reader-media.md](../../ui/pages/reader-media.md) · [components.md](../../ui/components.md) `MediaTypeTab`（"分类导航参数"）、`MediaRow`、`MediaCard`、`MediaHeader`、`MediaList` · admin.pen 09 / 09m / 09c · [ADR-012 §3](../../engineering/features/F-005-书影音/architecture/adr/ADR-012-shelf-reader-build-and-covers.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | TC-US03-03、04、05、06（产物部分）、07、08、11、13（扩展 `tests/build/reader-output.test.ts`，夹具 `reader-fixture` + `.shelf.json`） | 构建 |
| 2 | TC-US03-01、02、06（对齐）、09、10（`tests/e2e/reader-media.spec.ts`；切换分类用例点击后 `waitForURL` 目标分类，覆盖"动画后跳转"；水合前用 `waitForHydration`） | E2E |
| 3 | TC-US03-15、16、17、18（同文件） | E2E |

## DoD（完成定义）

- [x] 页面与 admin.pen 09 / 09m / 09c 一致
- [x] `MediaRow`、`MediaCard` 的评分用 `StarRating size="sm" readOnly`（任务 5 新建的组件，静态渲染不水合；[rating-face-stars](../../backlog/rating-face-stars.md)）
- [x] 测试清单全部由红变绿；影响范围：`tests/build/reader-output.test.ts` 原有用例、`tests/e2e/` 读者端 spec（`reader-*`）chromium 通过
- [x] F-004 Backlog（`specs/backlog/` 中 F-004 条目，无则在 feature-roadmap F-004 行备注）记一句"Pagefind 是否索引 `/media` 待 F-004 决定"

## 依赖

7（数据与纯函数）；`MediaTypeTabs.tsx` + `GooeyNav.tsx` 来自任务 4（若任务 4 未完成，本任务先建这两个文件及其单元测试，任务 4 复用）

## 影响的文件

- `src/pages/media/index.astro`、`[type].astro`（新建）
- `src/components/reader/{MediaHeader,MediaList,MediaCard,MediaRow}.astro`（新建）
- `tests/build/reader-output.test.ts`、`tests/e2e/reader-media.spec.ts`（新建）

## 回滚策略

删除新文件；构建测试 git 还原

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| reader-media.md、components.md（读者端 Media 组件） | 标注已实现 |
| [gooey-media-tabs](../../backlog/gooey-media-tabs.md) | 勾选读者页验收条件；全部勾完后状态 → done |
| stories/_index.md | US-03 → done（任务 7、8 都完成后） |
| [sprint-9/_index.md](_index.md) | 状态 → completed |
