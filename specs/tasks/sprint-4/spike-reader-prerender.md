# spike-reader-prerender: 读者页预渲染验证（spike）

**Sprint**: Sprint 4
**序号**: 1
**状态**: completed
**类别**: SETUP
**架构层级**: 配置 + 表现层（spike）
**所属 Feature**: [F-002 博客首页与阅读](../../product/features/F-002-博客首页与阅读/feature-scope.md)
**来源 PBI**: [blog-home-reading](../../backlog/blog-home-reading.md)

## 意图声明

- **改动意图**: 用最小页面验证 ADR-007 / feature-architecture §4.4 的 6 个假设：① Vite 虚拟模块 `virtual:reader-data` 在 workerd 预渲染中可 import；② 虚拟模块数据与 `renderMarkdown` 不进入运行时 Worker 包；③ 预渲染页面中 React 岛（`client:idle` / `client:visible`）输出 SSR HTML 与水合脚本；④ `getStaticPaths` 参数含 `#`、空格、`/`、中文的标签路径能生成、能经 `astro preview` 访问；⑤ `src/pages/404.astro` 预渲染，未知路径返回 404 状态与该页；⑥ `astro preview` 下读者页走静态资源（不经 SSR）。结果写入 ADR-007"验证结果"；任一失败按 ADR-007"退路"改设计后再继续
- **影响范围**: 临时页面 `src/pages/_spike-reader/**`（spike 结束后删除或改为正式页面）、`src/integrations/reader-data.ts`（最小版）、`astro.config.mjs`、`wrangler.jsonc`（`not_found_handling`）
- **不变量**: `/admin/**`、`/api/**`、`/img/**` 行为不变；生产构建仍能成功
- **不在本任务**: 正式取数逻辑（build-reader-data-source）；正式页面

## 产品需求来源

| 来源 | 链接 |
|------|------|
| User Story | [US-03](../../product/features/F-002-博客首页与阅读/stories/reader-site/US-03-static-rebuild/story.md) AC1；[TC-US03-01](../../test/features/F-002-博客首页与阅读/acceptance/reader-site/US-03-tests.md) |
| 设计依据 | [ADR-007](../../engineering/features/F-002-博客首页与阅读/architecture/adr/ADR-007-reader-build-data.md) · [feature-architecture §4.4、§5](../../engineering/features/F-002-博客首页与阅读/architecture/feature-architecture.md) |

## 测试清单（红 → 绿）

| # | 测试 | 层级 |
|---|------|------|
| 1 | `tests/spike/reader-prerender.test.ts`（Node：执行 `astro build` 到临时目录）：静态 HTML 存在于 `dist/client`（含编码标签路径与 `404.html`）；`dist/server` 的 Worker 包不含虚拟模块中的标记字符串 | 构建 |
| 2 | `tests/spike/reader-prerender.spec.ts`（Playwright + `astro preview`）：预渲染页、标签路径、未知路径 404、岛水合后可交互 | E2E |

## DoD（完成定义）

### 实现类
- [x] 6 个假设各有结论（通过 / 失败 + 退路），写入 ADR-007"验证结果"
- [x] 若有失败，ADR-007、feature-architecture、reader module-spec 已按退路修订
- [x] spike 页面不进入正式路由（删除或仅 dev 注入）

### 测试类
- [x] 变更点测试：上述测试清单全部由红变绿（只跑本任务的测试文件）
- [ ] 影响范围回归：新建代码，影响范围为空集——按 2026-10-15 作者要求，回归、lint、check、webkit 补跑统一放到 Sprint 4 全部任务完成后

## 依赖

无

## 影响的文件

- `src/integrations/reader-data.ts`（最小版）
- `src/pages/_spike-reader/**`（临时）
- `astro.config.mjs`、`wrangler.jsonc`
- `tests/spike/reader-prerender.*`

## 回滚策略

删除 spike 页面、插件注册与测试；还原 `astro.config.mjs`、`wrangler.jsonc`

## 完成后反哺

| 文档 | 更新内容 |
|------|---------|
| [ADR-007](../../engineering/features/F-002-博客首页与阅读/architecture/adr/ADR-007-reader-build-data.md) | 验证结果 |
| [sprint-4/_index.md](_index.md) | 本任务状态 → completed |
