# 博客首页与阅读

**Feature ID**: F-002
**状态**: draft
**创建时间**: 2026-10-15

---

## 1. 概述

**一句话描述**: 读者在首页了解作者，在 `/posts` 按时间或标签浏览已发布文章，进入详情页舒适地阅读正文与图片；读者页在构建时预渲染为静态页，作者发布后自动重建。

**背景**:
F-001 已能写作、发布文章（`post` Domain 与公开接口 `GET /api/posts[/:slug]` 已实现），预览中的图片组件（`ArticleImage`、`ImageGallery`、`LiveBadge`）已按读者端标准实现。F-002 把这些内容呈现给读者。整站结构参考 pseudoyu，文章列表参考 DIYgod，详情页参考 Innei（取舍见 [Backlog](../../../backlog/blog-home-reading.md)）。

**目标用户**:
- 读者（游客，无需登录）：在桌面与手机上浏览、阅读文章
- 作者：发布文章后在读者端看到结果；维护首页个人资料（改配置文件）

---

## 2. 范围

### In Scope（本次要做的）

- **读者端外壳**：
  - 顶栏：站点名 / 头像回首页、文章、书影音、摄影外链、GitHub、RSS、主题切换（亮 / 暗 / 跟随系统）；手机端文字项换成图标，GitHub / RSS 收起
  - 书影音 `/media`（F-005）、RSS `/rss.xml`（F-004）照常显示，功能上线前点进去为 404 页
  - 子页底部 `> cd ..`：文章详情 → `/posts`，其余 → `/`；首页不显示
  - 读者端 404 页
- **首页 `/`**：自我介绍——头像、几段简介、社交链接、邮箱；不列文章。内容来自配置文件 `src/config/site.ts`（先用占位内容开发，真实文案由作者提供）
- **文章列表 `/posts`**：已发布文章按发布时间倒序、分页；卡片含标题、摘要、日期、标签（可点进标签页）、封面；双层虚线错位悬停效果
  - 摘要：有 `summary` 字段用字段，没有则取正文渲染后的纯文本前约 120 字（去掉 Markdown / HTML），最多 3 行
  - 封面：有封面时右侧显示 128×128，没有则不显示
- **标签页 `/tags/:tag`**：某标签下的已发布文章列表（样式同 `/posts`，标签不区分大小写）
- **文章详情 `/posts/:slug`**：
  - Markdown 渲染与预览一致（GFM、代码高亮、亮暗主题），复用 `renderMarkdown`
  - 阅读排版：纸张正文区、段首缩进 2 字、首段首字下沉、带署名的引用
  - 三栏：左侧同标签文章、中间正文、右侧阅读进度与目录；窄屏收起为可用形态
  - 文末上一篇 / 下一篇
  - 图片：复用 `ArticleImage`、`ImageGallery`、`LiveBadge`（宽图、图注、组图网格 / 手风琴、实况照片悬停 / 长按播放、马赛克渐显）
  - 灯箱：点击图片全屏查看，左右切换文中所有图片（DepthCarousel 层叠，引入 `gsap`），手机下滑关闭，实况照片在灯箱内可播放
- **构建时预渲染与重建**：读者页（`/`、`/posts`、`/posts/:slug`、`/tags/:tag`）构建时生成静态页；把 F-001 的 `PublicationHooks` 空实现换成调用 Workers Builds Deploy Hook，发布 / 更新 / 撤回 / 删除后触发重建
- **文章封面（F-001 增量）**：`post` 新增封面字段（工作稿与已发布快照各一份，随发布进入快照）；写文章页设置抽屉可上传 / 更换 / 移除封面（复用 US-05 图片上传）；公开接口返回封面

### Out of Scope（本次不做的）

- 站内搜索、评论（Giscus）、RSS 内容生成、SEO 元数据 → F-004
- 书影音页面内容 → F-005；作品集 → F-003
- 阅读数 / 在读人数 / 喜欢、AI 朗读、翻译、赞赏
- 详情页"概要"摘要块、附件卡片、手写签名、字体切换
- 后台可编辑的"关于我"（首页内容只改配置文件）
- 文章列表搜索框
- 灯箱内双指缩放 / 双击放大、"从原位置缩放打开"（DepthCarousel 3D 层叠不支持，见 [article-image-display](../../../backlog/article-image-display.md)）
- 读者端 SSR（Workers 付费版方案，仅作为退路保留在 ADR-001）

---

## 3. 边界定义

### 本 Feature 负责

- 读者端全部页面、外壳、主题切换与 404
- 已发布文章的读取与展示（只读 `post` 已发布快照）
- 读者页构建时预渲染、Deploy Hook 重建触发
- 灯箱组件 `Lightbox`
- 文章封面字段与上传入口（作为 F-001 增量在本 Feature 内完成）

### 本 Feature 不负责

- 文章的创建、编辑、发布流程本身 → F-001
- 搜索、评论、RSS、SEO → F-004

### 依赖的其他 Feature

| Feature | 依赖内容 | 说明 |
|---------|----------|------|
| F-001 | `post` Domain 已发布快照、公开接口 `GET /api/posts[/:slug]` | 构建脚本读线上公开接口（[reader-build-time-prerender](../../../backlog/reader-build-time-prerender.md)） |
| F-001 | `renderMarkdown` 与图片插件 | 预览与读者端同一实现（MD-UT-06 同构） |
| F-001 | `ArticleImage`、`ImageGallery`、`LiveBadge`（`src/components/article/`） | 点击回调 `onItemClick` / `onActiveClick` 由 F-002 接灯箱 |
| F-001 | `PublicationHooks` 接口 | F-002 提供 Deploy Hook 实现 |
| F-001 | 图片上传（US-05） | 封面上传复用 |

### 被依赖情况

| Feature | 使用内容 | 说明 |
|---------|----------|------|
| F-003 / F-004 / F-005 | 读者端外壳（顶栏、页脚、`> cd ..`、主题切换） | 后续读者页沿用 |
| F-004 | 构建后的静态读者页 | Pagefind 在构建后索引 |

**反向影响**:
- **F-001 数据模型**：`post` 新增封面字段（新迁移 0003）；工作稿哈希、发布快照、"有未发布修改"判断需纳入封面；公开接口与后台接口返回封面
- **F-001 写文章页**：设置抽屉新增封面上传区（admin.pen 03 / 03m 设置抽屉需同步）
- **F-001 发布流程**：`PublicationHooks` 由空实现改为调用 Deploy Hook；触发失败只记日志，不影响发布结果
- **F-001 图片组件**：读者页传入点击回调打开灯箱；组件需在构建时预渲染下正常 hydrate（[image-refine-loading](../../../backlog/image-refine-loading.md)"待 design-arch 解决"）

---

## 4. User Story 分组

> 详见 [stories/_index.md](./stories/_index.md)（由 group-stories 产出）

---

## 5. 成功指标

| 指标 | 目标值 | 衡量方式 |
|------|--------|----------|
| 零 Worker CPU | 读者页全部为静态页，访问不执行 Worker 代码 | 构建产物检查（读者路由均为预渲染） |
| 发布到可见 | 发布 / 更新 / 撤回 / 删除后 P95 ≤ 5 分钟读者看到变化 | 线上实测重建时长 |
| 草稿不可见 | 草稿、已撤回、已删除文章对读者 100% 不可见（列表、详情、标签页、上一篇 / 下一篇、同标签文章） | 验收测试 |
| 加载性能 | 手机 Lighthouse 性能 ≥ 90、LCP < 2.5s、CLS < 0.1（图片预留宽高不跳动） | Lighthouse（移动端模拟） |
| 手机可用 | 390 宽屏幕上三栏收起、目录、灯箱均可用 | E2E（390 视口） |

---

## 6. 相关文档

- [Backlog 条目](../../../backlog/blog-home-reading.md)、[article-image-display](../../../backlog/article-image-display.md)、[reader-build-time-prerender](../../../backlog/reader-build-time-prerender.md)、[image-refine-loading](../../../backlog/image-refine-loading.md)
- [全局 NFR](../../nfr.md)（读者页 LCP / 性能分 / JS 体积、构建时预渲染、移动端 ≥ 360px）
- [站点地图](../../../ui/site-map.md)、设计先行稿 [admin.pen](../../../ui/admin.pen)「页面区 · 读者端」05 / 05m / 06 / 06m

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本：纳入封面字段（F-001 增量）与灯箱；摘要优先用 `summary` 字段；未上线入口照常显示；首页内容走配置文件 | miraclehifi |
