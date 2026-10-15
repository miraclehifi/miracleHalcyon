# 读者端外壳与 404（Reader Shell）

**路由**: 读者端全部页面；404 为所有未匹配路径
**状态**: draft
**关联**: F-002 · US-01 · 设计稿 [admin.pen](../admin.pen) 05 / 06 / 07 / 08（顶栏、页脚、`> cd ..`）

## 页面用途

所有读者页共用的骨架：顶栏导航、主题切换、页脚、返回上一级入口；以及找不到页面时的 404。

## 顶栏 `SiteHeader`

| 项 | 桌面（≥ 768px） | 手机（< 768px） |
|----|----------------|----------------|
| 左 | 站点名"miracleHalcyon"（`font-body` 20px，链接 `/`） | 同左，18px |
| 右 | 文字项"文章""书影音"（14px，间距 24）+ 图标 摄影 / GitHub / RSS / 主题切换（`IconButton/Ghost`，图标 18px） | 图标 文章 / 书影音 / 摄影 / 主题切换（44×44）；GitHub、RSS 不显示 |
| 当前项 | `accent` + 字重 600，`aria-current="page"`；文章详情、标签页、`/posts/page/n` 高亮"文章"；首页、404 不高亮 | 当前图标 `accent` |
| 高度 / 边框 | 68px，下边框 `line` | 60px |

- 摄影、GitHub：`target="_blank" rel="noopener noreferrer"`，图标按钮的 `aria-label` 分别为"摄影（新标签页）""GitHub（新标签页）"
- 摄影站、GitHub 地址取自 `src/config/site.ts`；为空的项不渲染（不留空位）
- 书影音 `/media`、RSS `/rss.xml` 在 F-004 / F-005 上线前照常显示，点进去为 404（2026-10-15 作者决定）
- 读者端不出现任何 `/admin` 链接

### 主题切换

| 项 | 规则 |
|----|------|
| 三态 | 亮色 → 暗色 → 跟随系统 → 亮色；图标分别 `sun` / `moon` / `sun-moon`；`aria-label="主题：亮色|暗色|跟随系统"` |
| 存储 | `localStorage` 键 `theme`，值 `light` / `dark` / `system`；读写失败时只在本次会话生效 |
| 首屏 | `<head>` 内联脚本在样式前读取存储，设置 `<html data-theme>`（`system` 时不设，交给 `light-dark()` 跟随 `prefers-color-scheme`），避免闪烁 |
| 跟随系统 | 选 `system` 时页面随系统切换实时变化，无需刷新 |
| 后台 | 后台共用同一个存储键与内联脚本（后台无切换按钮，跟随读者端选择） |

## 页脚 `SiteFooter`

站点名、签名一句话、版权"© 2026 miracleHalcyon"、RSS / GitHub 文字链接；上边框 `line`，内边距 32px 0 48px。

## 返回上一级 `BackLink`

| 页面 | 显示 | 目标 |
|------|------|------|
| `/` | 不显示 | — |
| `/posts/:slug` | `> cd ..` | `/posts` |
| `/posts`、`/posts/page/n`、`/tags/:tag`、404 | `> cd ..` | `/` |

位置：主体内容最后、页脚之前，与正文左对齐；`font-mono` 14px `ink-muted`，悬停 `accent` + 底边线。是普通链接（不用 `history.back()`），无 JS 也可用。

## 404 页 `NotFound`（设计稿 08）

| 区域 | 内容 |
|------|------|
| 主体（居中，宽 640，上下留白 160 / 200） | "404"（`font-mono` 14px `ink-faint`）→ 标题"页面不存在"（`text-display`）→ 说明"这里没有你要找的内容：地址可能写错了，文章也可能已经撤回或删除。"（16px `ink-muted`）→ 链接"回首页"（`accent`）、"看看全部文章"（`ink-muted`） |
| 顶栏 / 页脚 | 同其他读者页；顶栏不高亮任何项 |

- HTTP 状态 404；静态构建产物为 `404.html`（Cloudflare 静态资源 `not_found_handling: "404-page"`，以 design-arch 为准）
- `/admin/**` 不使用本页（仍按 F-001 规则跳转登录）

## 页面状态

读者页都是构建时生成的静态页，没有加载中 / 接口错误态；数据为空的情况在各页面规格中定义。

## 响应式

断点 768px（与全站一致）。版心：首页 640、列表 896、详情三栏 1338（见各页面）。左右边距：桌面 50px，手机 20px。

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-15 | 初始版本（F-002 design-ui） | miraclehifi |
