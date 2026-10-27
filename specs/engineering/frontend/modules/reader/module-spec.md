# reader 模块（读者页构建期视图模型与运行时脚本）

**最后更新**: 2026-10-22
**状态**: self-checked
**来源**: [F-002 feature-architecture](../../../features/F-002-博客首页与阅读/architecture/feature-architecture.md) · [ADR-007](../../../features/F-002-博客首页与阅读/architecture/adr/ADR-007-reader-build-data.md) · [ADR-008](../../../features/F-002-博客首页与阅读/architecture/adr/ADR-008-reader-interactivity.md)

> 无状态模块，不是 Domain：只消费 `post` 的已发布快照（`PublishedPost`，见 [post api-contract](../../../backend/domains/post/api-contract.md) §2），不访问 D1。
> 页面与组件见 [reader-*.md 页面规格](../../../../ui/pages/)。
> 新增直接依赖：`rehype-parse`（`prepareArticleHtml` 解析渲染结果）；`github-slugger`、`mdast-util-to-string`（已是间接依赖，改为直接依赖，版本取最新）。

---

## 1. 构建数据

### 1.1 类型（`src/lib/reader/types.ts`）

```ts
export interface ReaderPost {            // = PublishedPost（公开接口 / 夹具中的一项）
  slug: string; title: string; summary: string; tags: string[];
  publishedAt: string;                   // yyyy-MM-dd（快照中必有：发布时已补齐）
  lastPublishedAt: string;               // ISO 8601 UTC
  body: string;                          // Markdown 原文
  cover: string | null;
}
export interface ReaderData { posts: ReaderPost[] }   // 已按 sortPublished 排序

export interface CardModel { slug: string; title: string; excerpt: string; publishedAt: string; tags: TagLink[]; cover: string | null }
export interface TagLink { name: string; slug: string }               // name 为该文章中的原写法
export interface TagGroup { slug: string; name: string; count: number; posts: ReaderPost[] }
export interface TocItem { id: string; text: string; depth: 2 | 3 }
```

### 1.2 Vite 插件 `readerData()`（`src/integrations/reader-data.ts`）

| 项 | 规则 |
|----|------|
| 模块 | `resolveId('virtual:reader-data')` → `\0virtual:reader-data`；`load()` 返回 `export default ${JSON.stringify(data)}` |
| 取数顺序 | `READER_FIXTURE` → 读 `tests/fixtures/reader/{name}.json`（不存在则报错）；否则 `READER_API_ORIGIN` → HTTP；否则 dev 模式用 `reader-fixture`；否则若 `READER_BOOTSTRAP=1` 用空数据；否则报错"未配置 READER_API_ORIGIN" |
| HTTP | `GET {origin}/api/posts?page=1`，按 `total` / `pageSize` 翻页取全部 slug；再并发 6 逐篇 `GET {origin}/api/posts/{encodeURIComponent(slug)}`；单个请求超时 15 秒 |
| 失败 | 任一请求非 200 / 非 JSON / 网络错误 → 抛 `ReaderDataError`，消息 `读取 {url} 失败：{status | 错误类型}`；`READER_BOOTSTRAP=1` 时同样失败才回退为空数据并 `console.warn` |
| 校验 | 每项按 §1.1 校验字段类型（slug 合法、publishedAt 为日期、tags 为字符串数组）；不合法 → 报错并指出 slug |
| 排序 | 输出前 `sortPublished` |
| 缓存 | 同一构建进程内只取一次（模块级 Promise） |
| 类型声明 | `src/env.d.ts` 声明 `virtual:reader-data` 的默认导出为 `ReaderData` |
| 只用于预渲染 | 只允许 `prerender = true` 的页面引用；构建产物检查运行时 Worker 包中不含 `virtual:reader-data` 内容 |

### 1.3 书影音数据 `virtual:shelf-data`（F-005 增量，[ADR-012](../../../features/F-005-书影音/architecture/adr/ADR-012-shelf-reader-build-and-covers.md)）

| 项 | 规则 |
|----|------|
| 模块（已实现） | 同一插件 `readerData()` 增加 `virtual:shelf-data`，默认导出 `{ entries: ShelfPublicEntry[] }`（字段见 [shelf api-contract](../../../backend/domains/shelf/api-contract.md) §2） |
| 夹具 | `READER_FIXTURE` → `tests/fixtures/reader/{name}.shelf.json`；文件不存在 → 空数组（不报错，现有夹具无需改动） |
| HTTP | `GET {origin}/api/shelf`，超时 15 秒；**404 → 空数组 + `console.warn`**（首次部署时线上 Worker 尚无该接口）；其他失败同 §1.2（`READER_BOOTSTRAP=1` 才回退为空） |
| 校验 | 每项校验 `type` 枚举、`title` 非空、`markedOn` 日期、`rating` 1–5 或 null、`cover` 为 `/covers/` 路径或 null、`doubanUrl` 为豆瓣 https 地址或 null；不合法 → 报错并指出标题 |
| 缓存 / 类型 / 只用于预渲染 | 同 §1.2；`src/env.d.ts` 声明默认导出类型 |
| 视图模型（已实现，Sprint 9 任务 7） | `src/lib/reader/shelf.ts`：`groupShelf`、`sortPublic`（公开数据无 id，以倒序下标代替 id 调 `sortEntries`，`groupByTime` 共用）、`shelfPath`、`markedMonth`、`emptyIcon`，规则见 [shelf domain-model](../../../backend/domains/shelf/domain-model.md) §6；排序与文案复用 `src/domains/shelf/entry.ts` 的 `sortEntries`、`statusLabel`、`countLabel` |

## 2. 纯函数（`src/lib/reader/`，全部可在 Node / jsdom 单元测试）

| 函数 | 文件 | 规则 | 关联 |
|------|------|------|------|
| `sortPublished(posts)`（已实现） | `sort.ts` | `publishedAt` 降序，相同时 `lastPublishedAt` 降序，再相同按 `slug` 升序（与公开列表 SQL 一致，补最后一级保证确定性） | US-04、US-09 |
| `paginate(items, page, size=20)`（已实现） | `sort.ts` | 返回 `{ items, page, totalPages, total, from, to }`；`totalPages = max(1, ceil(total/size))` | US-04、US-05 |
| `pagePaths(total, size=20)`（已实现） | `sort.ts` | 生成 2…totalPages（第 1 页不生成 `/page/1`） | US-04 |
| `plainText(markdown)`（已实现） | `excerpt.ts` | remark 解析 GFM → 去掉 `image`、`code`、`html`、`footnoteDefinition`、`definition` 节点 → `mdast-util-to-string`，块之间以空格连接，合并空白 | US-04、US-07 |
| `excerptOf(post)`（已实现） | `excerpt.ts` | `summary.trim()` 非空 → 原样；否则 `plainText(body)` 前 120 个码点，超出时去尾部空白加"…"；结果可为空字符串 | TC-US04-03 |
| `tagSlug(name)`（已实现） | `tags.ts` | `name.trim().toLowerCase().normalize('NFKC')`，把非 `\p{L}\p{N}` 的连续字符换成 `-`，去掉首尾 `-`；结果为空时用 `tag`（ADR-007 验证结果④） | TC-US05-06 |
| `groupTags(posts)`（已实现；另有 `tagSlugMap` 供链接统一取地址，`readerModel` 按数据缓存） | `tags.ts` | 按小写名分组（`C#` 与 `c#` 同组，`C#` 与 `C` 不同组）；组的 `slug` 取 `tagSlug`，多个组 `slug` 相同时除篇数最多（平手按名称升序第一个）的组外追加 `-{FNV-1a(小写名) 前 6 位}`（构建时在 workerd 中运行，`crypto.subtle` 只有异步接口，改用同步哈希）；`name` 取组内出现次数最多的写法，平手取最早发布文章中的写法；`count` = 文章数；`posts` 保持 `sortPublished` 顺序；返回按 `count` 降序、`name` 升序（`localeCompare('zh')`） | TC-US05-06、TC-US04-10 |
| `relatedPosts(post, all, max=8)`（已实现） | `related.ts` | 候选：除本文外与本文有共享标签（按 `tagSlug` 比较）的文章；排序：共享标签数降序 → 发布时间降序（`sortPublished` 次序）；取前 `max`；每项附 `sharedTags`（本文中的写法） | TC-US08-02 |
| `adjacentPosts(slug, sorted)`（已实现） | `adjacent.ts` | 在 `sortPublished` 序列中：`prev` = 下一个（更早发布），`next` = 上一个（更新发布）；不存在为 `null` | TC-US09-03 |
| `readingStats(text)`（已实现） | `reading-stats.ts` | 计数 = 汉字（`\p{Script=Han}`）个数 + 其余按 `[\p{L}\p{N}]+` 匹配的词数；`displayWords` = 向上取整到百（< 100 时为实际数）；`minutes = max(1, ceil(count/300))` | TC-US07-05 |
| `updatedDate(post)`（已实现） | `reading-stats.ts` | `lastPublishedAt` 取 UTC 日期；晚于 `publishedAt` 时返回该日期，否则 `null` | TC-US07-05 |
| `formatLongDate(date)`（已实现） | `reading-stats.ts` | `yyyy-MM-dd` → "2026年10月10日 星期六"（按日历计算星期，不依赖时区） | TC-US07-04 |
| `prepareArticleHtml(html)`（已实现：h1 降级、标题 id、目录、hasImages；`data-dropcap` 已实现） | `article-html.ts` | 在 `renderMarkdown`（默认选项：不带 `uploadPlaceholders`，正文中残留的上传占位被删除，见 markdown module-spec §2.1，2026-10-16）结果上（rehype 解析 → 变换 → 序列化）：① 正文 `h1` 改为 `h2`；② 第一个顶层元素是 `p` 时加 `data-dropcap`；③ 只有正文顶层的 h2 / h3 进目录并补 `id`（按 `github-slugger` 规则生成，同名追加 `-1`、`-2`）；引用、列表、脚注区里的标题不收，已有 id 的不覆盖（脚注区标题被 `aria-describedby` 引用），空标题不进目录；返回 `{ html, toc: TocItem[], hasImages }` | TC-US07-02、06、07、TC-US08-09 |
| `posterAspect(type, cover)`（F-005；已实现，Sprint 9 任务 14，[ADR-013](../../../features/F-005-书影音/architecture/adr/ADR-013-game-cover-igdb-link.md)、[media-wall-all-types](../../../../backlog/media-wall-all-types.md)） | `shelf.ts` | book / comic / movie / series → `"2 / 3"`；boardgame → `"1 / 1"`；game：`cover.width`、`cover.height` 均为正整数 → `"{w} / {h}"`，否则 `"3 / 4"`；`MediaPosterWall` 用它算砖块高（列宽 ÷ 比值）与静态网格的 `aspect-ratio` | TC-US03-21、22、UT-17 |
| `groupByReleaseYear(entries)`（F-005；待实现，[media-time-basis](../../../../backlog/media-time-basis.md)） | `shelf-time.ts` | 按 `year` 分段：每个年份一段、年份倒序，`year` 为空的归最后一段（`key: "unknown"`，`label: "未知年份"`）；段内按 `sortEntries`（进行中在前）；`meta` 为 "{n} 款 / 部"；返回结构同 `groupByTime`，供 `MediaPosterWall` 按 `MediaTimeBasis` 选择 | TC-US03-24、UT-20 |
| `groupByTime(entries, today)`（F-005；已实现，Sprint 9 任务 10） | `shelf-time.ts` | 输入为同一分类、已过滤隐藏的条目与本地日期 `today`（`yyyy-MM-dd`）；段顺序：在看（`in_progress`）→ 本月（同年同月，或晚于 `today`）→ 上个月（上一个日历月，可跨年）→ 本年 → 去年 → 更早各年倒序；返回 `{ key, label, meta, entries }[]`，空段不返回，段内按 `sortEntries`；`meta` 用 `countLabel` 的量词：本月 / 上个月 "{M} 月 · {n} 部"，本年 / 去年 "{yyyy} · {n} 部"，在看与更早年份 "{n} 部"（进行中段标签按 `statusLabel`：在看 / 在玩 / 在读；游戏量词"款"，Sprint 9 任务 14 已实现）；纯函数，日期按字符串拆分计算，不依赖时区 | TC-US03-20、UT-15 |
| `normalizeSiteConfig(raw)`（已实现） | `site-config.ts` | `name`、`avatar`、`bio`（≥ 1 段）必填；`github` / `photo` 为空串或 `undefined` → 省略，否则必须 `http:` / `https:` URL；`email` 空 → 省略，否则 `^[^\s@]+@[^\s@]+\.[^\s@]+$`；不合法抛 `Error('site.{字段} …')`，构建失败 | TC-US02-03、04 |

## 3. 运行时脚本（原生，ADR-008；进度、目录、抽屉已实现：`src/components/reader/reading.ts`）

| 脚本 | 文件 | 规则 |
|------|------|------|
| 首屏主题 | `src/layouts/BaseLayout.astro` 内联 `<script is:inline>` | 读 `localStorage.theme`（try/catch）；`light` / `dark` → `document.documentElement.dataset.theme = 值`；其他不设置 |
| 主题切换 | `ThemeToggle.astro` 的 `<script>` → `src/lib/reader/theme-toggle.ts` | `currentScheme()`：`data-theme` 优先，否则 `prefers-color-scheme`；点击翻转为相反配色，写存储（失败忽略）、设置 `data-theme`；支持 View Transitions 且未减少动效时在 `startViewTransition` 内同步切换，并对 `::view-transition-new(root)` 做以按钮中心为圆心的 clip-path 扩散（`circleClipPath` 纯函数，百分比坐标）；更新按钮 `aria-label`；未选择时监听系统配色变化同步名称 |
| 进度 | `reading.ts` 的 `progressOf(scrollY, top, height, viewport)` + 绑定 | 纯函数：`clamp(round((scrollY + viewport - top) / height * 100), 0, 100)`，其中正文顶部进入视口顶部之前为 0；`scroll` 事件 rAF 节流；写 `aria-valuenow`、文本、条宽 | UT-213、TC-US08-04 |
| 当前章节 | `reading.ts` 的 `currentHeading(tops, line)` | 返回最后一个 `top <= line` 的下标，都未越过时返回 0；阅读线 = 视口高 × 0.3；切换 `aria-current` | UT-214、TC-US08-05 |
| 目录跳转 | 同上 | 点击 → `preventDefault` → `scrollIntoView({ behavior: 减弱动效 ? 'auto' : 'smooth' })` + `history.replaceState(null, '', '#' + id)` | UT-215 |
| 目录抽屉 | `TocDrawer.astro`（`<dialog>`） | 按钮 → `showModal()`，焦点到当前章节项；Esc（原生 `cancel`）/ 点遮罩（点击目标为 dialog 本身）/ 关闭按钮 / 点目录项（先关闭再跳转）→ `close()`，焦点回按钮 | UT-218、TC-US08-07 |

## 4. React 岛

### 4.1 `PostCardList`（`src/components/reader/PostCardList.tsx`，`client:visible`）

Props：`cards: CardModel[]`。渲染 `AnimatedList`（`bare`，参数见 components.md"列表动效参数"），`renderItem` → `PostCard`（`active` 来自选中行）。`PostCard` 结构见 reader-post-list.md；SSR 输出完整 HTML，水合前即可点击。

### 4.2 `ArticleImagesIsland`（`client:idle`，仅 `hasImages` 时渲染）

| 项 | 规则 |
|----|------|
| 输入 | Props：`rootSelector`（正文容器）。挂载时查询 `figure[data-article-image]`（不在 `[data-gallery]` 内的）与 `div[data-gallery]`，按文档顺序建立图片列表 `LightboxImage[]`（`src`、`alt`、`caption`、`width`、`height`、`live`） |
| 挂载 | 复用 `reconcile-islands` 与 `MarkdownPreview` 相同的宿主替换方式：portal 渲染 `ArticleImage` / `ImageGallery`；正文只渲染一次，不需要复用逻辑 |
| 点击 | 单图：`ArticleImage` 新增可选 `onClick`（外层渲染为 `button`，`aria-label="查看大图：{alt}"`；不传时结构不变，预览不受影响）；组图：`ImageGallery` 的 `onImageClick(index)`（网格）/ 手风琴已展开项；加载失败的图片不打开 |
| 灯箱 | 首次打开时 `import('./Lightbox')`（含 gsap、DepthCarousel）；打开时记录触发元素，关闭后 `focus()` 回去 |
| 外链照片（[ADR-010](../../../features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)） | `collectArticleImages` 读出 `data-thumb` / `data-mp` → `ArticleImageData.external = { thumb, mainBytes? }`；`data-live` 且有 mp → `live = { videoSrc: 原图, range: { offset, size }, codec: 'hevc' }`。`ArticleImage`、组图单元格与 `Lightbox` 用 `src/components/article/external-media.ts` 的 `loadMainImage(src, mainBytes?)`（按地址缓存 Promise，正文与灯箱共用）；灯箱中未读取的照片先显示缩略图，读完换成主图。已实现（Sprint 8 任务 3、6）：`external-media.ts`（另有 `useInView`、`useMainImages`），`Lightbox` 只读取当前张 |

### 4.3 `Lightbox`（`src/components/reader/Lightbox.tsx`）

Props：`images`、`index`、`onClose`。规则见 reader-post-detail.md"图片与灯箱"、components.md"灯箱层叠参数"。滚动锁：打开时记录 `body.style.overflow` / `paddingRight`，设 `overflow: hidden` + 滚动条宽度补偿，关闭恢复。焦点陷阱：Tab / Shift+Tab 在灯箱内可聚焦元素间循环。下滑关闭：指针纵向位移 > 120px 或速度 > 0.5px/ms 且纵向大于横向 → `onClose`；横向拖动交给 DepthCarousel。

## 5. 重建钩子（`src/lib/rebuild/deploy-hook.ts`，已实现；路由用 `src/lib/rebuild/route-hooks.ts` 的 `deployHooksFor(context)`，handler 工厂改为 `hooksFor` 参数）

```ts
export function createDeployHookHooks(deps: {
  url: string | undefined;                        // env.DEPLOY_HOOK_URL
  fetch?: typeof fetch;
  waitUntil: (p: Promise<unknown>) => void;       // locals.cfContext.waitUntil
  log?: (event: string, detail: Record<string, unknown>) => void;  // 默认 console.error
}): PublicationHooks
```

| 情况 | 行为 |
|------|------|
| `url` 为空 | 返回 `noopHooks` |
| 调用 | `onPublicationChanged` 同步返回 resolved Promise；`waitUntil(fetch(url, { method: 'POST' }).then(检查 ok).catch(记日志))` |
| 失败 | `log('deploy_hook_failed', { status })` 或 `{ error: err.name }`；**不记录 url** |
| 接入 | `publish.ts`、`unpublish.ts`、`posts/[id].ts`（DELETE）的 `create*Handler` 新增可选 `hooks` 参数；`POST` / `DELETE` 导出处用 `createDeployHookHooks({ url: env.DEPLOY_HOOK_URL, waitUntil: (p) => context.locals.cfContext.waitUntil(p) })` |
| 类型 | `wrangler.jsonc` 不写该值（Secret）；`npm run cf-typegen` 后 `Env` 不含它，在 `src/env.d.ts` 补 `DEPLOY_HOOK_URL?: string` |

## 6. 站点配置（`src/config/site.ts`）

```ts
export default {
  name: 'Halcyon',
  avatar: '/avatar.png',
  bio: ['…', '…', '…'],
  github: 'https://github.com/example',
  photo: '',
  email: 'me@example.com',
  afilmory: {                       // US-13（ADR-010）：外链照片只认这里登记的站点与存储前缀；缺省则不识别粘贴、不解析扩展片段
    site: 'https://miraclehalcyon.afilmory.art',
    storage: 'https://raw.githubusercontent.com/miraclehifi/photo-assets/main/',
  },
  footerTagline: '写字，写代码，慢慢来。',
} satisfies SiteConfigInput;
```

页面统一经 `normalizeSiteConfig` 读取；占位内容在作者提供真实文案前保留。

## 7. 单元测试规格

| UT-ID | 对象 | 用例 | 预期 | 关联 TC |
|-------|------|------|------|---------|
| READER-UT-01 | `sortPublished` / `paginate` / `pagePaths` | 同日期不同 `lastPublishedAt`；41 篇第 3 页；0 篇 | 次序确定；第 3 页 1 篇、`from`/`to` 正确；0 篇 `totalPages` 1、`pagePaths` 空 | TC-US04-01、06、07 |
| READER-UT-02 | `excerptOf` / `plainText` | 见 TC-US04-03 数据 | 如 TC | TC-US04-03 |
| READER-UT-03 | `tagSlug` / `groupTags` | 见 TC-US05-06 数据；夹具标签统计 | 如 TC；Astro 25、显示名 Astro | TC-US05-06、TC-US04-10 |
| READER-UT-04 | `relatedPosts` | 夹具 `hello` | 第 1 位 filler-01、共 8 篇、不含本文 | TC-US08-02 |
| READER-UT-05 | `adjacentPosts` | 夹具；1 篇；首尾 | 如 TC | TC-US09-03 |
| READER-UT-06 | `readingStats` / `updatedDate` / `formatLongDate` | 见 TC-US07-05；`2026-10-10` | 如 TC；"2026年10月10日 星期六" | TC-US07-04、05 |
| READER-UT-07 | `prepareArticleHtml` | h1 正文；首元素为 p / figure / pre；同名 h2；h2 含代码与链接；只有 h4 | h1→h2；仅首元素为 p 时 `data-dropcap`；id 去重；toc 文本为可见文字；只有 h4 时 toc 空 | TC-US07-02、06、07，TC-US08-09 |
| READER-UT-08 | `normalizeSiteConfig` | 见 TC-US02-03、04 | 如 TC | TC-US02-03、04 |
| READER-UT-09 | `readerData` 取数（Node，`fetch` 替身） | 3 页列表 + 41 篇详情；第 2 页 500；返回 HTML；`READER_BOOTSTRAP=1` 且不可达；夹具不存在 | 41 篇且已排序；报错含 URL 与 500；报错"非 JSON"；空数据 + 警告；报错含夹具名 | TC-US03-07、08 |
| READER-UT-10 | `createDeployHookHooks` | url 空；200；500；抛错 | noop；`waitUntil` 收到 1 个 Promise 且 fetch 为 POST；日志含 status 不含 url；日志含 error 名 | TC-US03-02、05、06 |
| READER-UT-11 | `progressOf` / `currentHeading` | 见 UT-213、214 | 如左 | TC-US08-04、05 |
| READER-UT-12 | 主题 `next` 与应用 | 三态轮换；存储抛错 | 如 UT-201、203 | TC-US01-02 |

前端组件单元规格（UT-201…236）见 [frontend-unit-tests.md](../../../../test/features/F-002-博客首页与阅读/unit/frontend-unit-tests.md)。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本（F-002 design-domain） | miraclehifi |
| 2026-10-21 | 1.y | F-005：§1.3 `virtual:shelf-data` 与 `src/lib/reader/shelf.ts`（[ADR-012](../../../features/F-005-书影音/architecture/adr/ADR-012-shelf-reader-build-and-covers.md)） | miraclehifi |
| 2026-10-16 | 1.1 | 读者端渲染不输出上传占位（F-001 [media-upload-experience](../../../../backlog/media-upload-experience.md)，TC-US05-38） | miraclehifi |
| 2026-10-19 | 1.x | 外链照片：`ArticleImageData.external`、`live.range` / `codec`，灯箱主图；`site.afilmory`（[ADR-010](../../../features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)） | miraclehifi |
| 2026-10-23 | 1.z+1 | F-005：§2 新增 `posterAspect`；`groupByTime` 支持游戏（[game-case-shelf](../../../../backlog/game-case-shelf.md)） | miraclehifi |
| 2026-10-22 | 1.z | F-005：§2 新增 `groupByTime`（海报墙按时间分段，[media-poster-wall](../../../../backlog/media-poster-wall.md)） | miraclehifi |
