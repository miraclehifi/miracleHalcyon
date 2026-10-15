# ADR-008: 读者页交互——原生脚本优先，React 岛只用于图片与文章列表

## 状态
Accepted（2026-10-15，F-002 design-arch）

## 背景
全局 NFR 要求"无交互页面不加载 React 运行时"、手机 Lighthouse ≥ 90。读者页的交互有两类：
- 轻量：主题切换、阅读进度、目录高亮与跳转、窄屏目录抽屉
- 重量：正文图片组件（`ArticleImage` / `ImageGallery` / `LiveBadge`，F-001 已用 React 实现）、灯箱（DepthCarousel + gsap）、文章列表入场动效（AnimatedList + motion）

## 决策
| 交互 | 实现 | 加载时机 |
|------|------|---------|
| 主题切换 `ThemeToggle` | Astro 组件 + 原生 `<script>`；首屏主题由 `BaseLayout` `<head>` 中的内联脚本（`is:inline`）设置，后台页面同样受益；React 组件继续用 `src/lib/dom/theme.ts` 订阅主题 | 所有读者页 |
| 进度、目录高亮、目录跳转、`TocDrawer` | Astro 组件 + 原生 `<script>`（`IntersectionObserver` / `scroll` + rAF）；抽屉用原生 `<dialog>`（`showModal()` 提供焦点约束与 Esc） | 详情页 |
| 正文图片 + 灯箱 | 一个 React 岛 `ArticleImagesIsland`（`client:idle`）：查询正文中的 `figure[data-article-image]` / `div[data-gallery]`，按 F-001 预览同一套 `reconcile-islands` 规则挂载组件，并持有 `Lightbox` 状态；`Lightbox` 与 gsap 用动态 `import()` 在首次打开时加载 | 详情页，仅当正文含图片时渲染该岛 |
| 文章列表 `PostCardList` | React 岛（`client:visible`），AnimatedList + `PostCard`；服务端先输出完整卡片 HTML | `/posts`、`/tags/*` |
| 首页、404 | 只有 `ThemeToggle` 的原生脚本，**不加载 React** | — |

- 静态 HTML 自身可读：正文 `figure > img` 带宽高（无 JS 可看图、无布局跳动）；目录是普通锚点链接；`BackLink` 是普通链接
- 不引入客户端路由（View Transitions），每页独立加载

## 后果
- 正面：首页与 404 零 React；详情页的 React 只服务于图片，纯文字文章不加载；灯箱代码按需加载
- 负面：目录与进度要写一份原生实现（不能复用 React 组件）；列表页为动效加载 React + motion（约 60 KB gzip，components.md 既定取舍）
- 一致性：`ArticleImage` 等组件在读者页与预览中是同一份代码、同一套挂载规则
