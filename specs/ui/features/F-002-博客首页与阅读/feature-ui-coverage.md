# 博客首页与阅读 — UI 覆盖检查

> 验证本 Feature 的所有 US 在 UI 层面被完整覆盖。
> 由 design-ui 阶段生成。

**Feature**: F-002
**最后更新**: 2026-10-15
**设计稿**: [admin.pen](../../admin.pen)「页面区 · 读者端」05 / 05m / 05m-b / 06 / 06m / 07 / 07m / 08，03 设置抽屉　**流程**: [flows.md](../../pages/flows.md) §5–7
**设计规范**: 自定义（tw93 风格令牌，见 [design-tokens.md](../../design-tokens.md)）；设计方式：Pencil 设计稿 + Mermaid 流程 + 页面规格

## 覆盖矩阵

| US ID | US 名称 | 涉及页面 / 元素 | 覆盖状态 |
|-------|--------|----------------|---------|
| US-01 | reader-shell | [reader-shell.md](../../pages/reader-shell.md)：`SiteHeader` / `SiteNav`（当前项、外链按配置显示、手机图标化）、`ThemeToggle` 三态与首屏脚本、`SiteFooter`、`BackLink`、404 `NotFound`（08） | ✅ |
| US-02 | home-intro | [reader-home.md](../../pages/reader-home.md)：`HomeIntro`（06 / 06m）、`site.ts` 字段与校验 | ✅ |
| US-03 | static-rebuild | 无独立界面：[flows.md](../../pages/flows.md) §6 发布到可见；写文章页发布成功提示"已发布，几分钟后读者可见"（F-001 已有） | ✅ |
| US-04 | post-list | [reader-post-list.md](../../pages/reader-post-list.md)：`PostsHeader`、`TagIndex`、`PostCardList` / `PostCard`（摘要、封面、悬停）、`Pagination`、空态（07 / 07m） | ✅ |
| US-05 | tag-page | 同上（标签页同版式，页头"#标签"、地址规则） | ✅ |
| US-06 | post-cover | [admin-post-editor.md](../../pages/admin-post-editor.md) 设置抽屉 `CoverField`（03） | ✅ |
| US-07 | article-typography | [reader-post-detail.md](../../pages/reader-post-detail.md)：`ArticleHeader`（日期、字数、更新于、标签）、`ArticleContent`（缩进、首字下沉、引用署名、代码主题）、纸张 | ✅ |
| US-08 | reading-sidebars | 同上：`TagPostsNav`（05 左栏 / 05m 文末）、`TableOfContents`（05 右栏）、`ReadingProgress/Bar` + `TocButton` + `TocDrawer`（05m / 05m-b） | ✅ |
| US-09 | prev-next | 同上：`PostPager`（05 / 05m 文末） | ✅ |
| US-10 | image-lightbox | 同上"图片与灯箱"：`ArticleImage` / `ImageGallery` / `LiveBadge`（F-001 已实现）、`Lightbox` / `Lightbox/Mobile`（组件区） | ✅ |

## 覆盖检查结果

- [x] 所有 US 至少关联一个页面
- [x] 无遗漏 US
- [x] 每个页面定义了空 / 错误状态（读者页为静态页，无加载中 / 接口错误态）

## 可用性自查

| 原则 | 结论 |
|------|------|
| 匹配现实世界 | 界面只出现标题、日期、标签、"上一篇 / 下一篇"等读者熟悉的词；`> cd ..` 是站点风格（参考 pseudoyu），同时有顶栏"文章"兜底 |
| 识别而非回忆 | 顶栏当前项高亮；详情页显示所在章节与进度；标签页页头显示标签名与篇数 |
| 信息最小化 | 卡片只放标题、摘要、日期、标签、封面；首页不列文章 |
| 容错 | 读者端无破坏性操作；404 给出两条出路；封面移除不删除文件，可随时重新上传 |

## UI 设计补充的决定（Story 中未写明）

| # | 决定 | 涉及 |
|---|------|------|
| 1 | `/posts` 第 1 页显示标签索引"按标签浏览"（Backlog"标签入口"）；已补 US-04 验收 8 / BH-10 / TC-US04-10 | US-04 |
| 2 | 标题区显示字数与阅读时长（先行稿已有）；已补 US-07 验收 2 | US-07 |
| 3 | 窄屏目录用右下角浮动按钮 + 底部抽屉，取代先行稿中正文上方的折叠条（折叠条会随正文滚走） | US-08 |
| 4 | 正文中的 Markdown h1 降为 h2 显示，页面只有一个 h1 | US-07 |
| 5 | 首页链接行由"GitHub / RSS / 关于我"改为"GitHub / 摄影 / 邮箱"（RSS 已在顶栏，关于我即首页本身） | US-02 |
| 6 | 后台与读者端共用主题存储键，后台无切换按钮 | US-01 |
| 7 | 404 页除"回首页"外加"看看全部文章" | US-01 |
