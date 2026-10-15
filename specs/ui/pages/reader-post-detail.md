# 文章详情（Reader Post Detail）

**路由**: `/posts/:slug`
**状态**: draft
**关联**: F-002 · US-07、US-08、US-09、US-10 · 设计稿 [admin.pen](../admin.pen) 05 / 05m / 05m-b · 外壳见 [reader-shell.md](reader-shell.md) · 参考 [Innei 手记页](https://innei.in/notes/2026/8/24/midnight-memo-love-freedom-future)

## 页面用途

舒适地读完一篇文章：排版像纸质读物，长文能看到进度、跳章节，读完能去相关或相邻的文章，图片能放大看。

## 入口与出口

| 从哪来 | 去哪里 |
|--------|--------|
| `/posts`、标签页卡片；同标签文章；上一篇 / 下一篇；写文章页 slug 提示 | 标签 → `/tags/:tag`；同标签文章、上一篇 / 下一篇 → 其他详情；`> cd ..` → `/posts` |

## 布局（桌面 ≥ 1280px）

```
┌ SiteHeader ───────────────────────────────────────────────────────────┐
│  TagPostsNav 190 │ Paper 840（内容 750）                │ TOC 220      │
│  同标签文章       │ ArticleHeader                       │ 已读 38%      │
│  · 标题           │ ArticleContent                      │ ───────       │
│    #标签          │ PostPager                           │ 目录          │
│  …               │                                     │（sticky）     │
├ > cd .. ──────────────────────────────────────────────────────────────┤
└ SiteFooter ───────────────────────────────────────────────────────────┘
```

- 三栏间距 44，总宽 1338，居中；Body 内边距 32 50 72
- 左栏、右栏 `position: sticky; top: 24px`（各自超出视口时内部不滚动，只取前 8 篇 / 目录本身不长）
- 没有同标签文章时不渲染左栏，纸张与右栏整体居中

### 纸张 `Paper`

1px `line` 边框，圆角 8，内边距 56 45 48，底 `bg`；纵向块间距 40。`--article-bleed` = 45px（宽图向两侧扩出到纸张边缘）。

### 标题区 `ArticleHeader`

| 项 | 规则 |
|----|------|
| 标题 | `h1`，`font-prose-heading` 32px 700，行高 1.3 |
| 元信息 | `font-prose` 13px 斜体 `ink-faint`：发布日期"2026年10月8日 星期四"（`time[datetime=yyyy-MM-dd]`）· 约 N 字 · 阅读 M 分钟 · 更新于 2026年10月12日（仅当 `lastPublishedAt` 的日期晚于发布日期） |
| 标签 | 右侧 `TagChip` 链接到标签页 |
| 字数 | 正文纯文本字符数（中文按字、英文按词），向上取整到百位显示"约 3,200 字"；阅读时长 = 字数 / 300，至少 1 分钟 |

> 已实现（Sprint 4，add-article-page）：`src/pages/posts/[slug].astro`、`src/components/reader/ArticleHeader.astro`（`TagChip` 链接形态）、`ArticleContent.astro`；纸张、标题区、h1 降级与标题 id。

### 正文 `ArticleContent`

渲染与写文章页预览同一实现（`renderMarkdown`，构建时执行）。正文中 Markdown 的 `#`（h1）降为 h2 显示，保证页面只有一个 h1。

| 项 | 规则 |
|----|------|
| 字体 | 正文 `font-prose` 16px，行高 1.8，字间距 0.14px；h2–h4 `font-prose-heading` 700（24 / 20 / 16） |
| 段首缩进 | 正文直接子级 `p` 首行缩进 2em；列表、引用内段落、代码块、图片 `figure`、表格不缩进 |
| 首字下沉 | 仅当正文第一个元素是 `p` 时，对其首字：2.4 倍字号、左浮动、`font-prose-heading`；首段以图片 / 代码 / 标题开头时不下沉（构建时给该段加 `data-dropcap`） |
| 引用 | 左侧 2px `line-strong`，内边距左 20；`::before` 装饰大号"“"（`ink-faint`，`aria-hidden`）；最后一段以"— "或"—— "开头且引用不止一段时，该段渲染为 `<footer>` 署名，右对齐、`ink-muted`、不缩进 |
| 链接 | 正文链接默认同正文色 + 1px `line-strong` 底边，悬停 `accent`；外链 `rel="noopener"` |
| 标题锚点 | h2 / h3 带 `id`（与目录一致），`scroll-margin-top: 24px` |
| 代码块 | Expressive Code，亮 / 暗两套主题随 `data-theme` 切换，无需刷新 |

> 已实现（Sprint 4，add-article-typography）：段首缩进、首字下沉、标题 `scroll-margin-top` 在 `global.css` 的 `.article-content`；引用装饰引号与署名在 `.prose`（预览同步）；署名由 markdown 插件 `rehypeQuoteAttribution` 输出。

### 文末 `PostPager`

纸张内最后一块，上边框 `line`：左"← 上一篇"+ 标题（更早发布），右"下一篇 →"+ 标题（更新发布），16px；缺一侧时该侧留空；两侧都没有时不渲染。`nav aria-label="上一篇 / 下一篇"`。

### 右栏 `TableOfContents`

| 项 | 规则 |
|----|------|
| 进度 | "已读 N%"（13px `ink-faint`，`tabular-nums`）+ 2px 进度条（底 `line`，填充 `accent`）；`role="progressbar" aria-label="阅读进度"`；0% = 正文顶部到达视口顶部之前，100% = 正文底部进入视口 |
| 目录 | h2（14px `ink-muted`）、h3（13px `ink-faint`，左缩进 14）；`nav aria-label="目录"` |
| 当前项 | 最后一个越过阅读线（视口上方 30%）的标题；`accent` 600，`aria-current="true"` |
| 点击 | 平滑滚动到标题并 `replaceState` 更新 `#锚点`；减弱动效时直接跳转 |
| 无目录 | 正文没有 h2 / h3 时只显示进度 |

### 左栏 `TagPostsNav`

小标题"同标签文章"（13px `ink-faint`）；每项：标题（14px `ink-muted`，最多 2 行）+ 下方 `#标签`（12px `font-mono` `ink-faint`，只列与本文共享的标签）；最多 8 篇，按共享标签数降序、发布时间降序；不含本文。悬停标题 `accent`。

## 手机 / 窄屏（< 1280px）

| 项 | 规则 |
|----|------|
| 栏 | 只保留纸张；< 768px 时纸张去边框、内边距 0 20 |
| 进度 | 顶栏下方 2px 进度条 `ReadingProgress/Bar`（sticky），不显示百分比文字 |
| 目录 | 右下角浮动按钮 `TocButton`（48×48 圆形，`surface` 底、`line-strong` 边、轻投影，图标 `list`，`aria-label="目录"`，距右 / 下 20px）；无目录时不显示 |
| 目录抽屉 `TocDrawer`（05m-b） | 底部抽屉，高最多 60vh，圆角 16 16 0 0，`surface` 底；顶部把手 + "目录"+"已读 N%"+ 关闭（44×44）；目录项高 44；`role="dialog" aria-modal="true" aria-label="目录"`；打开时焦点到当前章节项；Esc / 点遮罩 / 关闭 / 点目录项后关闭，焦点回 `TocButton`；遮罩 `scrim` 37% |
| 同标签文章 | 移到文末（`PostPager` 之前）：`TagPostsNav/Mobile`，上边框 `line`，每项高 44 |
| 灯箱 | `Lightbox/Mobile` |

768–1279px 的平板与手机同一规则，纸张保留边框、最宽 840 居中。

## 图片与灯箱（US-10）

- 正文图片由 `ArticleImage` / `ImageGallery` / `LiveBadge` 渲染（F-001 已实现），构建时输出带宽高比的结构，客户端水合后接管加载渐显与实况播放
- 点击单图、网格单元格、手风琴已展开项（`onItemClick` / `onActiveClick`）打开 `Lightbox`，传入正文全部图片（按出现顺序）与当前下标；手风琴未展开项点击只展开
- 图片可聚焦（`button` 包裹，`aria-label="查看大图：{alt}"`），Enter 打开
- 加载失败的图片点击不打开灯箱（显示重试）
- `Lightbox`：`role="dialog" aria-modal="true" aria-label="图片查看"`；顶部左计数"3 / 12"（`overlay-ink-muted`）、右关闭 `OverlayButton`（48，手机 44）；底部居中图注；中间 DepthCarousel（参数见 [components.md](../components.md)"灯箱层叠参数"）；← / → 与左右箭头切换，首尾不循环、对应按钮 `disabled`；手机左右拖动切换、下滑超过 120px（或速度 > 0.5px/ms）关闭，不足回弹；打开时 `body` 锁定滚动（补偿滚动条宽度），焦点到关闭按钮并在灯箱内循环；关闭后焦点回到触发图片；当前图片加载失败显示"图片加载失败"+"重试"
- 只有 1 张图片时不显示左右按钮

> 已实现（Sprint 4，hydrate-article-images）：`src/components/reader/ArticleImagesIsland.tsx`（`client:idle`，仅含图片时渲染）+ `src/lib/reader/article-images.ts`（`collectArticleImages` 从静态 figure 读取数据并编号）；水合前的静态 figure / 组图由 `global.css` 的 `.article-content` 规则按最终版式占位。灯箱见 add-lightbox。
- 预览（写文章页）不传点击回调，不打开灯箱

## 页面状态

| 状态 | 表现 |
|------|------|
| slug 不存在 / 草稿 / 已撤回 / 大小写不符 | 404（不生成该页） |
| 正文为空 | 不可能（发布时校验正文必填） |
| 无标签 | 不渲染标签与左栏 |
| JS 未加载 | 正文、图片（静态 `<img>`）、目录链接可用；进度、当前项高亮、灯箱、实况播放不可用 |

## 数据需求（构建时）

`PublishedPost`（`slug`、`title`、`summary`、`tags`、`publishedAt`、`lastPublishedAt`、`body`、`cover`）+ 全部已发布文章摘要（计算同标签文章与相邻文章）。

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-15 | 初始版本：05 先行稿补左栏同标签文章、文末 `PostPager`、`> cd ..`、"更新于"；05m 目录改为浮动按钮 + 底部抽屉（05m-b），新增进度细条、文末同标签文章 | miraclehifi |
