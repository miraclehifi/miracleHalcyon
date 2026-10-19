# 站点地图（Site Map）

**产品**: miracleHalcyon
**最后更新**: 2026-10-16

> 设计稿：[admin.pen](admin.pen)（Pencil）　设计令牌：[design-tokens.md](design-tokens.md)　用户流程：[pages/flows.md](pages/flows.md)
> 读者端结构参考 [pseudoyu.com](https://www.pseudoyu.com/)（取舍见 [Backlog](../backlog/sitemap-pseudoyu-reference.md)）

## 导航结构

```
读者端（F-002，构建时预渲染）
├── 首页 /                     ← 自我介绍
├── 文章 /posts（/posts/page/:n）
│   └── 文章详情 /posts/:slug
├── 标签页 /tags/:tag（/tags/:tag/page/:n）
├── 404                        ← 所有未匹配路径
├── 书影音 /media              ← F-005
└── 摄影 ↗                     ← 外链（地址待定）

作者后台（F-001、F-006）
├── 登录 /admin/login
├── 文章列表 /admin              ← 后台首页
├── 写文章
│   ├── 新建 /admin/posts/new
│   └── 编辑 /admin/posts/:id
└── 存储 /admin/storage         ← F-006 未引用媒体清理
```

## 页面清单

| 页面 | 路由 | 所属模块 | 关联 Feature | 规格 | 状态 |
|------|------|---------|-------------|------|------|
| 登录页 | `/admin/login` | 作者后台 | F-001 | [admin-login.md](pages/admin-login.md) | draft |
| 文章列表 | `/admin` | 作者后台 | F-001 | [admin-post-list.md](pages/admin-post-list.md) | draft |
| 写文章页 | `/admin/posts/new`、`/admin/posts/:id` | 作者后台 | F-001 | [admin-post-editor.md](pages/admin-post-editor.md) | draft |
| 存储 | `/admin/storage` | 作者后台 | F-006 | [admin-storage.md](pages/admin-storage.md) | draft |
| 读者端外壳 / 404 | 全部读者页 / 未匹配路径 | 读者端 | F-002 | [reader-shell.md](pages/reader-shell.md) | draft |
| 首页 | `/` | 读者端 | F-002 | [reader-home.md](pages/reader-home.md) | draft |
| 文章 | `/posts`、`/posts/page/:n` | 读者端 | F-002 | [reader-post-list.md](pages/reader-post-list.md) | draft |
| 文章详情 | `/posts/:slug` | 读者端 | F-002 | [reader-post-detail.md](pages/reader-post-detail.md) | draft |
| 标签页 | `/tags/:tag`、`/tags/:tag/page/:n` | 读者端 | F-002 | [reader-post-list.md](pages/reader-post-list.md)（同版式） | draft |
| 书影音 | `/media` | 读者端 | F-005 | — | 规划中（书 / 电影 / 剧 / 动画 / 游戏） |

## 全局导航

| 入口 | 目标 | 条件 |
|------|------|------|
| 读者顶栏 · 左侧站点名 / 头像 | `/` | — |
| 读者顶栏 · 文章 | `/posts`（文章详情、标签页也高亮此项） | — |
| 读者顶栏 · 书影音 | `/media` | — |
| 读者顶栏 · 摄影（图标） | 外部摄影站（新标签页） | `site.ts` 配置了地址 |
| 读者顶栏 · GitHub（图标） | 作者 GitHub（新标签页） | `site.ts` 配置了地址 |
| 读者顶栏 · RSS（图标） | `/rss.xml`（F-004） | — |
| 读者顶栏 · 主题切换 | 亮 / 暗 / 跟随系统 | — |
| 读者端子页底部 · `> cd ..` | 上一级（文章详情 → `/posts`，其余 → `/`） | 首页不显示 |
| 文章卡片 / 详情标签 / 标签索引 | `/tags/:tag` | — |
| 详情页 · 同标签文章、上一篇 / 下一篇 | 其他 `/posts/:slug` | 有对应文章 |
| 404 · 回首页 / 看看全部文章 | `/` / `/posts` | — |
| 后台顶栏 · 站点名 | `/admin` | 已登录 |
| 后台顶栏 · 文章 | `/admin` | 已登录 |
| 后台顶栏 · 存储 | `/admin/storage` | 已登录 |
| 后台顶栏 · 查看博客 | `/`（新标签页） | 已登录 |
| 后台顶栏 · 登出 | `/admin/login` | 已登录 |
| 登录页 · 返回博客首页 | `/` | — |
| 写文章页 · ← 文章 | `/admin` | 已登录 |

读者顶栏手机端：文字项换成图标，GitHub / RSS 收起。读者端不展示任何后台入口（作者直接访问 `/admin`）。书影音 `/media`、RSS `/rss.xml` 在 F-005 / F-004 上线前照常显示，点进去为 404。

## 权限矩阵

| 页面 | 游客 | 管理员 |
|------|------|--------|
| 读者端页面 | ✅ | ✅ |
| `/admin/login` | ✅ | 已登录 → 直接跳 `/admin` |
| `/admin/**`（除登录页） | ❌ 跳转 `/admin/login?next=原路径` | ✅ |

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-10 | 初始版本：F-001 后台三页 + F-002 读者端占位 | miraclehifi |
| 2026-10-12 | 读者端参考 pseudoyu：首页改为自我介绍，文章列表独立为 `/posts`，新增书影音 `/media` 与摄影外链；补读者顶栏与子页返回规则 | miraclehifi |
| 2026-10-15 | F-002 design-ui：读者端页面规格（外壳 / 404、首页、列表与标签页、详情）；新增分页地址、404；外链按配置显示 | miraclehifi |
| 2026-10-16 | F-006 design-ui：新增存储页 `/admin/storage`；后台顶栏增加"文章""存储"导航（后台不用 `/admin/media`，留给 F-005） | miraclehifi |
