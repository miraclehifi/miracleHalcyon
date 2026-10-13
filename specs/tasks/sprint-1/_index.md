# Sprint 1：主干打通

**状态**: in_progress
**创建**: 2026-10-13
**Feature**: F-001 文章写作（[Backlog: article-writing](../backlog/article-writing.md)）
**规划方式**: 迭代递进（Sprint 2、3 见 [tasks/_index.md](../_index.md)）

> 主干目标：能登录 → 写文章（自动保存）→ 在列表中找到 → 发布 / 发布更新 / 撤回 → 读者接口读到已发布内容；预览可渲染 GFM 与代码高亮。
> 每个任务恰好一个测试、一个架构层级；顺序 = 依赖拓扑排序，同层按（被依赖数 × 不确定性）降序。**验证类任务（spike）排在最前**。

## 任务索引

| # | Task | 名称 | 来源 PBI | 类别 | 架构层级 | US | 依赖 | 被依赖数 | 不确定性 | 状态 |
|---|------|------|---------|------|---------|----|------|---------|---------|------|
| 1 | [scaffold-project-skeleton](scaffold-project-skeleton.md) | 搭建 Astro + Cloudflare 项目骨架 | article-writing | SETUP | 基础设施 | — | — | 3 | 中 | completed |
| 2 | [setup-workers-test-pool](setup-workers-test-pool.md) | 配置 Workers 单元 / 集成测试环境 | article-writing | SETUP | 基础设施 | — | scaffold-project-skeleton | 7 | 中 | completed |
| 3 | [spike-markdown-workers-runtime](spike-markdown-workers-runtime.md) | 验证：Expressive Code 在 Workers 中运行 | article-writing | SETUP | 基础设施 | US-04 | setup-workers-test-pool | 2 | 高 | completed |
| 4 | [spike-markdown-browser-worker](spike-markdown-browser-worker.md) | 验证：浏览器 Web Worker 渲染性能 | article-writing | SETUP | 基础设施 | US-04 | spike-markdown-workers-runtime | 1 | 高 | pending |
| 5 | [create-d1-init-migration](create-d1-init-migration.md) | 创建 D1 初始迁移 | article-writing | DATA | 数据层 | — | setup-workers-test-pool | 3 | 低 | pending |
| 6 | [define-design-token-styles](define-design-token-styles.md) | 实现设计令牌（亮 / 暗主题） | article-writing | FRONTEND | 表现层 | — | scaffold-project-skeleton | 7 | 低 | pending |
| 7 | [implement-password-hashing](implement-password-hashing.md) | 实现 PBKDF2 密码哈希与校验 | article-writing | DOMAIN | 领域层 | US-01 | setup-workers-test-pool | 2 | 中 | pending |
| 8 | [implement-login-throttle-rules](implement-login-throttle-rules.md) | 实现登录限流状态规则 | article-writing | DOMAIN | 领域层 | US-01 | setup-workers-test-pool | 1 | 低 | pending |
| 9 | [implement-sanitize-next](implement-sanitize-next.md) | 实现登录回跳地址清洗 | article-writing | DOMAIN | 领域层 | US-01 | setup-workers-test-pool | 1 | 低 | pending |
| 10 | [implement-session-repo](implement-session-repo.md) | 实现会话仓储（D1） | article-writing | DATA | 数据层 | US-01 | create-d1-init-migration | 1 | 低 | pending |
| 11 | [implement-throttle-repo](implement-throttle-repo.md) | 实现限流仓储（D1） | article-writing | DATA | 数据层 | US-01 | create-d1-init-migration | 1 | 低 | pending |
| 12 | [implement-auth-login-service](implement-auth-login-service.md) | 实现登录服务 | article-writing | DOMAIN | 领域层 | US-01 | implement-password-hashing, implement-login-throttle-rules | 1 | 中 | pending |
| 13 | [implement-auth-session-check](implement-auth-session-check.md) | 实现会话校验 | article-writing | DOMAIN | 领域层 | US-01 | implement-auth-login-service | 1 | 低 | pending |
| 14 | [implement-auth-middleware](implement-auth-middleware.md) | 实现认证与 Origin 校验中间件 | article-writing | API | 接口层 | US-01 | implement-auth-session-check, implement-session-repo, implement-sanitize-next | 3 | 中 | pending |
| 15 | [implement-login-endpoint](implement-login-endpoint.md) | 实现 POST /api/admin/login | article-writing | API | 接口层 | US-01 | implement-auth-middleware, implement-throttle-repo | 1 | 低 | pending |
| 16 | [add-hash-password-script](add-hash-password-script.md) | 提供生成管理员密码哈希的脚本 | article-writing | SETUP | 基础设施 | US-01 | implement-password-hashing | 0 | 低 | pending |
| 17 | [build-button-component](build-button-component.md) | 实现 Button（SpecularButton） | article-writing | FRONTEND | 表现层 | — | define-design-token-styles | 3 | 中 | pending |
| 18 | [build-icon-button-component](build-icon-button-component.md) | 实现 IconButton | article-writing | FRONTEND | 表现层 | — | define-design-token-styles | 3 | 低 | pending |
| 19 | [build-field-component](build-field-component.md) | 实现 Field | article-writing | FRONTEND | 表现层 | — | define-design-token-styles | 2 | 低 | pending |
| 20 | [build-alert-component](build-alert-component.md) | 实现 Alert | article-writing | FRONTEND | 表现层 | US-01 | define-design-token-styles | 1 | 低 | pending |
| 21 | [build-toast-component](build-toast-component.md) | 实现 Toast 与提示队列 | article-writing | FRONTEND | 表现层 | US-08 | build-icon-button-component | 1 | 低 | pending |
| 22 | [build-status-badge-component](build-status-badge-component.md) | 实现 StatusBadge | article-writing | FRONTEND | 表现层 | US-07, US-08 | define-design-token-styles | 2 | 低 | pending |
| 23 | [build-segmented-control-component](build-segmented-control-component.md) | 实现 SegmentedControl | article-writing | FRONTEND | 表现层 | US-07 | define-design-token-styles | 1 | 低 | pending |
| 24 | [build-confirm-dialog-component](build-confirm-dialog-component.md) | 实现 ConfirmDialog | article-writing | FRONTEND | 表现层 | US-08 | build-button-component | 1 | 低 | pending |
| 25 | [build-save-indicator-component](build-save-indicator-component.md) | 实现 SaveIndicator | article-writing | FRONTEND | 表现层 | US-06 | define-design-token-styles | 1 | 低 | pending |
| 26 | [build-login-page](build-login-page.md) | 实现登录页 | article-writing | FRONTEND | 表现层 | US-01 | implement-login-endpoint, build-button-component, build-field-component, build-alert-component | 0 | 低 | pending |
| 27 | [implement-slugify](implement-slugify.md) | 实现 slugify | article-writing | DOMAIN | 领域层 | US-03 | setup-workers-test-pool | 2 | 低 | pending |
| 28 | [implement-post-content-normalize](implement-post-content-normalize.md) | 实现文章内容规范化与校验 | article-writing | DOMAIN | 领域层 | US-03 | implement-slugify | 3 | 低 | pending |
| 29 | [implement-content-hash](implement-content-hash.md) | 实现内容哈希 | article-writing | DOMAIN | 领域层 | US-08 | implement-post-content-normalize | 1 | 低 | pending |
| 30 | [implement-post-status-derivation](implement-post-status-derivation.md) | 实现发布状态派生 | article-writing | DOMAIN | 领域层 | US-07, US-08 | implement-content-hash | 2 | 低 | pending |
| 31 | [implement-publish-validation](implement-publish-validation.md) | 实现发布校验 | article-writing | DOMAIN | 领域层 | US-08 | implement-post-content-normalize | 1 | 低 | pending |
| 32 | [implement-post-repo](implement-post-repo.md) | 实现文章仓储（D1） | article-writing | DATA | 数据层 | US-03, US-06, US-08 | create-d1-init-migration, implement-post-status-derivation | 4 | 中 | pending |
| 33 | [implement-post-save-service](implement-post-save-service.md) | 实现新建与自动保存服务 | article-writing | DOMAIN | 领域层 | US-03, US-06 | implement-post-status-derivation, implement-post-content-normalize | 1 | 低 | pending |
| 34 | [enforce-slug-uniqueness](enforce-slug-uniqueness.md) | 实现 slug 全站唯一校验 | article-writing | DOMAIN | 领域层 | US-03 | implement-post-save-service | 2 | 低 | pending |
| 35 | [implement-post-publish-service](implement-post-publish-service.md) | 实现发布与发布更新服务 | article-writing | DOMAIN | 领域层 | US-08 | enforce-slug-uniqueness, implement-publish-validation | 2 | 中 | pending |
| 36 | [implement-post-unpublish-service](implement-post-unpublish-service.md) | 实现撤回服务 | article-writing | DOMAIN | 领域层 | US-08 | implement-post-publish-service | 1 | 低 | pending |
| 37 | [implement-post-list-query](implement-post-list-query.md) | 实现后台列表查询（D1） | article-writing | DATA | 数据层 | US-07 | implement-post-repo | 1 | 低 | pending |
| 38 | [implement-tag-suggestions](implement-tag-suggestions.md) | 实现标签补全查询（D1） | article-writing | DATA | 数据层 | US-03 | implement-post-repo | 1 | 低 | pending |
| 39 | [implement-published-query](implement-published-query.md) | 实现已发布只读查询（D1） | article-writing | DATA | 数据层 | US-08 | implement-post-repo | 2 | 低 | pending |
| 40 | [implement-create-post-endpoint](implement-create-post-endpoint.md) | 实现 POST /api/admin/posts | article-writing | API | 接口层 | US-03, US-06 | implement-post-repo, enforce-slug-uniqueness, implement-auth-middleware | 2 | 低 | pending |
| 41 | [implement-get-post-endpoint](implement-get-post-endpoint.md) | 实现 GET /api/admin/posts/:id | article-writing | API | 接口层 | US-03 | implement-create-post-endpoint | 4 | 低 | pending |
| 42 | [implement-save-post-endpoint](implement-save-post-endpoint.md) | 实现 PUT /api/admin/posts/:id | article-writing | API | 接口层 | US-03, US-06 | implement-get-post-endpoint | 1 | 低 | pending |
| 43 | [implement-list-posts-endpoint](implement-list-posts-endpoint.md) | 实现 GET /api/admin/posts | article-writing | API | 接口层 | US-07 | implement-post-list-query, implement-create-post-endpoint | 1 | 低 | pending |
| 44 | [implement-publish-endpoint](implement-publish-endpoint.md) | 实现 POST /api/admin/posts/:id/publish | article-writing | API | 接口层 | US-08 | implement-post-publish-service, implement-get-post-endpoint | 1 | 低 | pending |
| 45 | [implement-unpublish-endpoint](implement-unpublish-endpoint.md) | 实现 POST /api/admin/posts/:id/unpublish | article-writing | API | 接口层 | US-08 | implement-post-unpublish-service, implement-get-post-endpoint | 1 | 低 | pending |
| 46 | [implement-tags-endpoint](implement-tags-endpoint.md) | 实现 GET /api/admin/tags | article-writing | API | 接口层 | US-03 | implement-tag-suggestions, implement-auth-middleware | 1 | 低 | pending |
| 47 | [implement-public-post-detail-endpoint](implement-public-post-detail-endpoint.md) | 实现 GET /api/posts/:slug | article-writing | API | 接口层 | US-08 | implement-published-query | 0 | 低 | pending |
| 48 | [implement-public-post-list-endpoint](implement-public-post-list-endpoint.md) | 实现 GET /api/posts | article-writing | API | 接口层 | US-08 | implement-published-query | 0 | 低 | pending |
| 49 | [implement-markdown-gfm-render](implement-markdown-gfm-render.md) | 实现 GFM 渲染 | article-writing | DOMAIN | 领域层 | US-04 | spike-markdown-workers-runtime | 1 | 低 | pending |
| 50 | [implement-markdown-sanitize](implement-markdown-sanitize.md) | 实现 Markdown XSS 过滤 | article-writing | DOMAIN | 领域层 | US-04 | implement-markdown-gfm-render | 1 | 低 | pending |
| 51 | [implement-markdown-code-highlight](implement-markdown-code-highlight.md) | 实现代码高亮（亮 / 暗主题） | article-writing | DOMAIN | 领域层 | US-04 | implement-markdown-sanitize | 1 | 中 | pending |
| 52 | [implement-relative-time-format](implement-relative-time-format.md) | 实现列表相对时间格式 | article-writing | FRONTEND | 表现层 | US-07 | scaffold-project-skeleton | 1 | 低 | pending |
| 53 | [build-post-list-item](build-post-list-item.md) | 实现 PostListItem（静态卡片） | article-writing | FRONTEND | 表现层 | US-07 | build-status-badge-component, implement-relative-time-format, build-icon-button-component | 1 | 低 | pending |
| 54 | [build-post-list-page](build-post-list-page.md) | 实现文章列表页（主干） | article-writing | FRONTEND | 表现层 | US-07 | build-post-list-item, implement-list-posts-endpoint, build-button-component | 1 | 低 | pending |
| 55 | [add-post-list-status-filter](add-post-list-status-filter.md) | 文章列表状态筛选 | article-writing | FRONTEND | 表现层 | US-07 | build-post-list-page, build-segmented-control-component | 1 | 低 | pending |
| 56 | [add-post-list-search](add-post-list-search.md) | 文章列表标题搜索 | article-writing | FRONTEND | 表现层 | US-07 | add-post-list-status-filter | 1 | 低 | pending |
| 57 | [add-post-list-pagination](add-post-list-pagination.md) | 文章列表分页 | article-writing | FRONTEND | 表现层 | US-07 | add-post-list-search | 1 | 低 | pending |
| 58 | [add-post-list-empty-states](add-post-list-empty-states.md) | 文章列表空状态与无结果 | article-writing | FRONTEND | 表现层 | US-07 | add-post-list-pagination | 0 | 低 | pending |
| 59 | [build-editor-page-shell](build-editor-page-shell.md) | 实现写文章页框架与加载 | article-writing | FRONTEND | 表现层 | US-03 | implement-get-post-endpoint, build-status-badge-component, build-icon-button-component | 3 | 中 | pending |
| 60 | [build-markdown-editor-pane](build-markdown-editor-pane.md) | 实现编辑区（标题 + 源码区 + 底栏） | article-writing | FRONTEND | 表现层 | US-03 | build-editor-page-shell | 1 | 低 | pending |
| 61 | [build-post-settings-drawer](build-post-settings-drawer.md) | 实现设置抽屉（slug 跟随、摘要、日期） | article-writing | FRONTEND | 表现层 | US-03 | build-editor-page-shell, build-field-component, implement-slugify | 2 | 低 | pending |
| 62 | [build-tag-input](build-tag-input.md) | 实现标签输入与补全 | article-writing | FRONTEND | 表现层 | US-03 | build-post-settings-drawer, implement-tags-endpoint | 0 | 低 | pending |
| 63 | [implement-autosave-controller](implement-autosave-controller.md) | 实现自动保存状态机 | article-writing | FRONTEND | 表现层 | US-06 | setup-workers-test-pool | 1 | 中 | pending |
| 64 | [wire-autosave-to-editor](wire-autosave-to-editor.md) | 写文章页接入自动保存 | article-writing | FRONTEND | 表现层 | US-06 | implement-autosave-controller, build-markdown-editor-pane, build-post-settings-drawer, build-save-indicator-component, implement-save-post-endpoint | 2 | 中 | pending |
| 65 | [show-slug-conflict-error](show-slug-conflict-error.md) | 显示 slug 冲突错误 | article-writing | FRONTEND | 表现层 | US-03 | wire-autosave-to-editor | 0 | 低 | pending |
| 66 | [build-markdown-preview-pane](build-markdown-preview-pane.md) | 实现实时预览区 | article-writing | FRONTEND | 表现层 | US-04 | implement-markdown-code-highlight, spike-markdown-browser-worker, build-editor-page-shell | 0 | 中 | pending |
| 67 | [implement-publish-action](implement-publish-action.md) | 实现"发布"操作 | article-writing | FRONTEND | 表现层 | US-08 | wire-autosave-to-editor, implement-publish-endpoint, build-toast-component | 1 | 低 | pending |
| 68 | [implement-publish-update-action](implement-publish-update-action.md) | 实现"发布更新"操作 | article-writing | FRONTEND | 表现层 | US-08 | implement-publish-action | 1 | 低 | pending |
| 69 | [implement-unpublish-action](implement-unpublish-action.md) | 实现"撤回为草稿"操作 | article-writing | FRONTEND | 表现层 | US-08 | implement-publish-update-action, implement-unpublish-endpoint, build-confirm-dialog-component | 0 | 低 | pending |

共 69 个任务：基础设施 5、数据层 7、表现层 29、领域层 17、接口层 11。

## 关键路径

```
scaffold-project-skeleton → setup-workers-test-pool → spike-markdown-workers-runtime → spike-markdown-browser-worker
  → create-d1-init-migration → implement-post-repo → … → implement-create-post-endpoint
  → build-editor-page-shell → wire-autosave-to-editor → implement-publish-action → implement-publish-update-action → implement-unpublish-action
```

**风险闸门**：`spike-markdown-workers-runtime` 不通过 → 暂停 Markdown 相关任务（`implement-markdown-*`、`build-markdown-preview-pane`），按 ADR-001 退路修订设计后再继续；其余任务不受影响。

## US 覆盖（Sprint 1 范围）

| US | Sprint 1 覆盖 | 留到后续 |
|----|--------------|---------|
| US-01 | 登录、限流、访问保护、登录页 | — |
| US-03 | 新建 / 编辑、slug 跟随与冲突、标签补全、摘要、日期 | — |
| US-04 | GFM + 代码高亮预览、XSS 过滤 | 视图切换、窄屏 Tab、同步滚动（Sprint 2） |
| US-06 | 2 秒自动保存、保存状态、离开拦截、失败重试 | 本地暂存与恢复横幅、401 暂存跳转（Sprint 2） |
| US-07 | 列表、筛选、搜索、分页、空状态 | 入场动效、左滑抽屉（Sprint 2） |
| US-08 | 发布、发布更新、撤回、读者只读接口 | — |
| US-02、05、09、10、11、12 | — | Sprint 2 / 3 |

## 跨 Feature 影响

| 影响 | 本 Sprint 处理 |
|------|---------------|
| F-002 读取已发布文章 | `implement-published-query`、公开 `/api/posts` 两个端点 |
| 读者缓存失效钩子 | `implement-post-publish-service` 中提供 `PublicationHooks` 空实现 |

## Sprint 目标

<!-- Sprint 关闭时根据实际完成的任务生成 -->

## DoD（Sprint 级）

- [ ] 所有任务状态为 completed
- [ ] `npm test` 与 `npm run test:e2e` 全部通过
- [ ] 主干 E2E：登录 → 新建 → 自动保存 → 列表可见 → 发布 → `GET /api/posts/:slug` 200 → 撤回 → 404
- [ ] ADR-001 已记录 spike 结论
- [ ] 设计文档已反哺"已实现"标记
