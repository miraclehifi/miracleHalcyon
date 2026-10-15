# 文章列表与标签页（Reader Post List）

**路由**: `/posts`、`/posts/page/:n`（n ≥ 2）、`/tags/:tag`、`/tags/:tag/page/:n`
**状态**: draft
**关联**: F-002 · US-04、US-05 · 设计稿 [admin.pen](../admin.pen) 07 / 07m · 外壳见 [reader-shell.md](reader-shell.md)

## 页面用途

按发布时间浏览全部已发布文章，或只看某个标签的文章。两个路由同一版式，只有页头不同。

## 入口与出口

| 从哪来 | 去哪里 |
|--------|--------|
| 顶栏"文章"、详情页 `> cd ..`、404"看看全部文章" | 卡片 → `/posts/:slug` |
| 卡片 / 详情页 / 标签索引中的标签 | 标签 → `/tags/:tag` |
| — | 分页 → 同路由的其他页；`> cd ..` → `/` |

## 布局

主体居中，宽 896px（手机左右 20px），上留白 56px，块间距 32px：

1. **页头 `PostsHeader`**：
   - `/posts`：标题"文章"（`text-display`，手机 `text-title`）+ 右侧"{N} 篇文章"（14px `ink-faint`，`tabular-nums`）
   - `/tags/:tag`：标题"#{标签显示名}" + "{N} 篇文章"；标题下一行"全部文章"链接回 `/posts`（13px `ink-muted`）
2. **标签索引 `TagIndex`**（只在 `/posts` 第 1 页）：小标题"按标签浏览"（13px `ink-faint`）+ 全部已发布标签的 `TagChip`（`# 名称 · 篇数`），按篇数降序、名称升序，换行排列，间距 8
3. **文章卡片列表 `PostCardList`**：每页 20 张 `PostCard`，间距 20；底层 AnimatedList 入场（见 [components.md](../components.md)"列表动效参数"）
4. **分页 `Pagination`**：左"第 21–40 篇，共 41 篇"，右"上一页 1 2 3 下一页"；只有 1 页时不显示
5. `> cd ..`

## 文章卡片 `PostCard`

| 区域 | 桌面 | 手机（`PostCard/Mobile`） |
|------|------|-----------------------|
| 外框 | 1px 虚线 `line-strong`，圆角 12，内边距 28，底 `bg` | 内边距 16 20 |
| 标题 | 20px 600，最多 2 行 | 18px，与封面同行 |
| 摘要 | 14px `ink-muted`，最多 3 行；为空时不渲染 | 在标题 / 封面下方 |
| 元信息 | 12px：日期（`yyyy-MM-dd`，`time[datetime]`）· `#标签`（`font-mono`，链接，悬停虚线下划线） | 同左 |
| 封面 | 右侧 128×128，圆角 8，`object-fit: cover`，`alt=""`、`loading="lazy"`；无封面不渲染、文字占满 | 72×72 |

- **摘要**：`summary` 非空用 `summary`；否则取正文渲染后的纯文本（去掉标题符号、强调符号、图片、代码块、HTML），前 120 字，截断处加"…"
- **结构**：`<article>`；标题是 `<a href="/posts/:slug">`，用伪元素把可点区域扩到整卡；标签链接叠在伪元素之上，不嵌套在标题链接里；Tab 顺序"标题 → 各标签"
- **悬停**（`PostCard/Hover`，只在 `(hover: hover)` 下）：上层虚线框左上移 4px、下层右下移 4px，0.3s ease-out；键盘焦点在卡片内时同样触发；同一时间只有一张（AnimatedList 选中行）。减弱动效时不移动，只把上层边框换成 `ink-faint`
- 草稿、已撤回文章不会出现在列表中

## 标签地址

`/tags/{tagSlug}`：标签名转小写，非字母数字的连续字符换成 `-`，去掉首尾 `-`（"C# 与 .NET/Core" → `/tags/c-与-net-core`）；不同标签得到同一地址时追加短哈希（ADR-007 验证结果④）。站内链接不带尾斜杠。大小写不同的写法合并为同一页，显示名取出现最多的写法（相同时取最早发布文章中的写法）。

## 页面状态

| 状态 | 表现 |
|------|------|
| 无已发布文章 | `/posts` 显示 `EmptyState`（图标 `feather`，标题"还没有文章"，说明"第一篇正在写。"）；无标签索引、无分页 |
| 页码超出 / `page/1` / 非数字 | 404（这些地址不生成） |
| 只在草稿中的标签 | 404（不生成） |

## 数据需求（构建时）

已发布文章摘要列表：`slug`、`title`、`summary`（或由正文派生的 `excerpt`）、`publishedAt`、`lastPublishedAt`、`tags`、`cover`。

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-15 | 初始版本：06 先行稿中的标签入口与文章列表移到 `/posts`；标签页同版式 | miraclehifi |
