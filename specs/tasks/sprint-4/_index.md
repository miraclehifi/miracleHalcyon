# Sprint 4：博客首页与阅读

**状态**: in_progress
**创建**: 2026-10-15
**Feature**: F-002 博客首页与阅读（[Backlog: blog-home-reading](../../backlog/blog-home-reading.md)；并入 [article-image-display](../../backlog/article-image-display.md) 灯箱、[reader-build-time-prerender](../../backlog/reader-build-time-prerender.md) 落地）
**规划方式**: 迭代递进（见 [tasks/_index.md](../_index.md)）

> 目标：读者能在首页认识作者，在 `/posts` 和标签页浏览已发布文章，进入详情页舒适地读正文、看图（灯箱）、跳章节、去相关或相邻文章；读者页构建时预渲染，作者发布后自动重建；作者可给文章设置封面。
> 粒度按项目规则 [`.claude/rules/tasks.md`](../../../.claude/rules/tasks.md)：一个任务 = 一个可演示的功能点，可跨层，带测试清单（2–5 项）。顺序 = 依赖拓扑排序，同层按（被依赖数 × 不确定性）降序。
> **测试安排（2026-10-15 作者要求"全部开发完成后再做测试"）**：任务内只写并跑本任务测试清单里的测试（红 → 绿）；影响范围回归、webkit 补跑、`npm run lint`、`npm run check`、全量 `npm test` + `npm run test:e2e` + `npm run test:build` 统一放到 19 个任务全部完成后，并与 F-001（Sprint 1–3）的 code-review、verify 一起进行。

## 任务索引

| # | Task | 名称 | 类别 | 架构层级 | US | 依赖 | 被依赖数 | 不确定性 | 状态 |
|---|------|------|------|---------|----|------|---------|---------|------|
| 1 | [spike-reader-prerender](spike-reader-prerender.md) | 读者页预渲染验证（spike） | SETUP | 配置 + 表现层（spike） | US-03 | — | 2 | 高 | completed |
| 2 | [build-reader-data-source](build-reader-data-source.md) | 构建数据源与读者夹具 | SETUP | 配置 + 领域层（reader 纯函数） | US-03 | spike-reader-prerender | 2 | 中 | pending |
| 3 | [add-reader-layout](add-reader-layout.md) | 读者端外壳：顶栏、页脚、返回与 404 | FRONTEND | 表现层 | US-01 | spike-reader-prerender | 4 | 低 | pending |
| 4 | [add-article-page](add-article-page.md) | 文章详情页：正文渲染与标题区 | FRONTEND | 表现层 + 领域层（reader 纯函数） | US-07 | build-reader-data-source、add-reader-layout | 3 | 中 | pending |
| 5 | [add-post-list-page](add-post-list-page.md) | 文章列表 /posts 与分页 | FRONTEND | 表现层 | US-04 | build-reader-data-source、add-reader-layout | 2 | 中 | pending |
| 6 | [hydrate-article-images](hydrate-article-images.md) | 详情页正文图片水合 | FRONTEND | 表现层 | US-10 | add-article-page | 1 | 中 | pending |
| 7 | [add-lightbox](add-lightbox.md) | 灯箱：打开、切换、关闭 | FRONTEND | 表现层 | US-10 | hydrate-article-images | 1 | 高 | pending |
| 8 | [add-theme-toggle](add-theme-toggle.md) | 主题切换与首屏主题 | FRONTEND | 表现层 | US-01 | add-reader-layout | 1 | 低 | pending |
| 9 | [add-home-intro](add-home-intro.md) | 首页自我介绍 | FRONTEND | 表现层 | US-02 | add-reader-layout | 1 | 低 | pending |
| 10 | [add-post-card-details](add-post-card-details.md) | 卡片摘要、封面与悬停效果 | FRONTEND | 表现层 + 领域层（reader 纯函数） | US-04 | add-post-list-page | 1 | 低 | pending |
| 11 | [add-tag-pages](add-tag-pages.md) | 标签页与标签索引 | FRONTEND | 表现层 + 领域层（reader 纯函数） | US-05、US-04 | add-post-list-page | 1 | 中 | pending |
| 12 | [add-article-typography](add-article-typography.md) | 阅读排版：段首缩进、首字下沉、引用署名、代码主题 | FRONTEND | 表现层 + 领域层（markdown 插件） | US-07 | add-article-page | 1 | 低 | pending |
| 13 | [add-article-navigation](add-article-navigation.md) | 同标签文章与上一篇 / 下一篇 | FRONTEND | 表现层 + 领域层（reader 纯函数） | US-08、US-09 | add-article-page | 1 | 低 | pending |
| 14 | [add-reading-progress-toc](add-reading-progress-toc.md) | 阅读进度、目录与窄屏目录抽屉 | FRONTEND | 表现层 | US-08 | add-article-navigation | 1 | 中 | pending |
| 15 | [refine-lightbox](refine-lightbox.md) | 灯箱：实况播放、焦点与降级 | FRONTEND | 表现层 | US-10 | add-lightbox | 1 | 中 | pending |
| 16 | [add-post-cover-api](add-post-cover-api.md) | 文章封面字段（数据 + 领域 + 接口） | API | 数据 + 领域 + 接口 | US-06 | — | 1 | 低 | pending |
| 17 | [add-cover-field](add-cover-field.md) | 设置抽屉封面上传 | FRONTEND | 表现层 | US-06 | add-post-cover-api | 0 | 低 | pending |
| 18 | [add-deploy-hook-rebuild](add-deploy-hook-rebuild.md) | 发布后触发读者页重建 | API | 接口层（适配器） | US-03 | — | 0 | 低 | pending |
| 19 | [check-reader-build-output](check-reader-build-output.md) | 读者页构建产物检查 | TEST | 构建 | US-03、US-01 | add-home-intro、add-tag-pages、add-reading-progress-toc、refine-lightbox、add-post-card-details、add-article-typography、add-theme-toggle | 0 | 低 | pending |

共 19 个任务：spike 1、构建 / 配置 1、接口 2、前端 14、构建检查 1。US 覆盖：US-01 2 个、US-02 1、US-03 4（含 spike 与产物检查）、US-04 3、US-05 1、US-06 2、US-07 2、US-08 2、US-09 1（与 US-08 合并）、US-10 3。

## 依赖图

```
spike-reader-prerender ─┬─▶ build-reader-data-source ─┬─▶ add-article-page ─┬─▶ hydrate-article-images ─▶ add-lightbox ─▶ refine-lightbox ──┐
                        │                              │                    ├─▶ add-article-typography ──────────────────────────────┤
                        │                              │                    └─▶ add-article-navigation ─▶ add-reading-progress-toc ───┤
                        │                              └─▶ add-post-list-page ─┬─▶ add-post-card-details ──────────────────────────────┤
                        │                                                      └─▶ add-tag-pages ──────────────────────────────────────┤
                        └─▶ add-reader-layout ─┬─▶（add-article-page、add-post-list-page 同时依赖）                                     │
                                               ├─▶ add-theme-toggle ───────────────────────────────────────────────────────────────────┤
                                               └─▶ add-home-intro ─────────────────────────────────────────────────────────────────────┴─▶ check-reader-build-output

add-post-cover-api ─▶ add-cover-field（独立，F-001 增量）
add-deploy-hook-rebuild（独立）
```

## ⚠️ 前置确认项汇总

| 任务 | 事项 |
|------|------|
| spike-reader-prerender | 6 个假设任一失败，按 ADR-007"退路"修订设计后再继续后续任务 |
| add-reader-layout | 首页 / 列表 / 详情尚未实现时，顶栏当前项与 `> cd ..` 的部分断言随对应任务补跑 |
| add-lightbox | DepthCarousel 源码与许可证在实现开始时核对 |
| 部署（Sprint 外） | Workers Builds 配置 `READER_API_ORIGIN`、首次 `READER_BOOTSTRAP=1`、Secret `DEPLOY_HOOK_URL`；重建时长 TC-US03-10 在 verify 阶段线上实测 |

## 跨 Feature 影响（来自 feature-architecture §6）

| 影响 | 本 Sprint 处理 |
|------|---------------|
| F-001 post 新增 `cover` | add-post-cover-api（含编辑器请求体、本地暂存） |
| F-001 发布 / 撤回 / 删除触发重建 | add-deploy-hook-rebuild |
| F-001 markdown 引用署名（预览同步变化） | add-article-typography |
| F-001 `ArticleImage` 可选 `onClick` | hydrate-article-images |
| F-001 `BaseLayout` 首屏主题脚本 | add-theme-toggle（回归 F-001 主题相关 E2E） |
| F-001 E2E 构建带 `READER_FIXTURE` | build-reader-data-source |

## DoD（Sprint 级）

- [ ] 所有任务状态为 completed
- [ ] `npm run lint`、`npm run check`、`npm test`、`npm run test:e2e`、`npm run test:build` 全部通过（Sprint 末统一跑一次）
- [ ] ⚠️ 前置确认项全部有结论，并同步到对应文档
- [ ] 设计文档已反哺"已实现"标记；F-002 stories/_index.md 状态更新
- [ ] 之后进入 F-001 + F-002 统一 code-review 与 verify
