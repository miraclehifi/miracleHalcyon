# 博客首页与阅读 User Stories 索引

**Feature ID**: F-002
**最后更新**: 2026-10-15

---

## 1. Story 分组概览

| 分组 | 说明 | US 数量 | 状态 |
|------|------|---------|------|
| reader-site | 读者端外壳、首页、构建时预渲染与发布后重建 | 3 | draft |
| post-browsing | 文章列表、标签页、文章封面 | 3 | draft |
| post-reading | 文章详情：正文排版、三栏、上一篇 / 下一篇、图片与灯箱 | 4 | draft |

依赖：post-browsing、post-reading 依赖 reader-site（外壳与预渲染）；US-06 封面先于 US-04 卡片封面显示。

---

## 2. 所有 User Stories

### reader-site

> 读者端的骨架：外壳、首页，以及让读者页成为静态页的构建与重建。

| US ID | 名称 | 状态 | 说明 |
|-------|------|------|------|
| US-01 | reader-shell | draft | 顶栏、主题切换、`> cd ..`、读者端 404 |
| US-02 | home-intro | draft | 首页自我介绍（配置文件驱动） |
| US-03 | static-rebuild | draft | 读者页构建时预渲染；发布等操作后经 Deploy Hook 重建 |

### post-browsing

> 找文章：按时间、按标签。

| US ID | 名称 | 状态 | 说明 |
|-------|------|------|------|
| US-04 | post-list | draft | `/posts` 列表：卡片、摘要、封面、分页、悬停效果 |
| US-05 | tag-page | draft | `/tags/:tag` 标签页 |
| US-06 | post-cover | draft | 文章封面字段与设置抽屉上传（F-001 增量） |

### post-reading

> 读文章：正文、导航、图片。

| US ID | 名称 | 状态 | 说明 |
|-------|------|------|------|
| US-07 | article-typography | draft | 正文渲染与阅读排版（纸张、缩进、首字下沉、引用署名） |
| US-08 | reading-sidebars | draft | 三栏：同标签文章、阅读进度、目录；窄屏收起 |
| US-09 | prev-next | draft | 文末上一篇 / 下一篇 |
| US-10 | image-lightbox | draft | 正文图片展示与灯箱 |

---

## 3. 实现优先级

| 顺序 | US ID | 名称 | 理由 |
|------|-------|------|------|
| 1 | US-03 | static-rebuild | 预渲染数据源与构建方式是所有读者页的前提，风险最高 |
| 2 | US-01 | reader-shell | 所有读者页共用的外壳 |
| 3 | US-07 | article-typography | 核心价值：读文章 |
| 4 | US-04 | post-list | 进入文章的入口 |
| 5 | US-02 | home-intro | 简单独立 |
| 6 | US-05 | tag-page | 复用列表 |
| 7 | US-09 | prev-next | 简单，依赖详情页 |
| 8 | US-08 | reading-sidebars | 依赖详情页 |
| 9 | US-10 | image-lightbox | 依赖详情页与图片组件，引入 gsap |
| 10 | US-06 | post-cover | 跨 Feature 改数据模型；列表先按"无封面"实现 |

---

## 变更历史

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-10-15 | 创建分组 | miraclehifi |
| 2026-10-15 | write-story：10 个 US | miraclehifi |
