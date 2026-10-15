# ADR-007: 读者页构建数据源与重建触发

## 状态
Accepted（2026-10-15，F-002 design-arch；作者授权文档不逐项确认）

## 背景
ADR-001 修订后读者页在构建时预渲染。[reader-build-time-prerender](../../../../../backlog/reader-build-time-prerender.md) 留下五个待验证事项：预渲染运行环境与能否 fetch、构建额度与合并、重建时长、首次部署无接口、Pagefind。另有 E2E 需要确定性数据（读者页无法按用例临时造数据）。

已确认的事实（`@astrojs/cloudflare` 14.3）：
- 预渲染默认在 **workerd** 中执行（`prerenderEnvironment: 'workerd'`），可选 `'node'`
- 现有 `src/middleware.ts` 与 API 路由 `import { env } from "cloudflare:workers"`；预渲染页面也会经过 middleware，node 预渲染下该导入不可用
- 运行时可从 `locals.cfContext.waitUntil` 拿到 `ExecutionContext`

## 决策

### 1. 数据经 Vite 虚拟模块在构建时一次性注入
- 新增 Vite 插件 `readerData()`（`src/integrations/reader-data.ts`，在 `astro.config.mjs` 注册），提供虚拟模块 `virtual:reader-data`
- 插件的 `load()` 在 **Node**（Vite 进程）中执行，按构建环境变量取数，输出 `export default { posts: [...] }`：

| 变量 | 取值 | 行为 |
|------|------|------|
| `READER_FIXTURE` | 夹具名，如 `reader-fixture` | 读 `tests/fixtures/reader/{名}.json`（E2E、本地开发） |
| `READER_API_ORIGIN` | 如 `https://halcyon.example.com` | `GET {origin}/api/posts?page=n` 翻完全部页，再并发 6 逐篇 `GET /api/posts/:slug` 取正文 |
| `READER_BOOTSTRAP=1` | — | 两者都没有或接口不可达时，允许以 0 篇文章构建（只用于首次部署） |
| 都未设置 | — | 本地 `astro dev` 默认 `READER_FIXTURE=reader-fixture`；`astro build` 报错退出 |

- 取数失败（非 200、非 JSON、网络错误）→ 抛错使构建失败，错误含接口地址与状态（TC-US03-08），不会产出空站点覆盖线上
- 预渲染页面（workerd）只 `import data from 'virtual:reader-data'`，不在 workerd 内 fetch；数据只拉一次，所有页面共享
- 派生数据（摘要、标签分组、同标签、相邻、字数、目录）由 `src/lib/reader/` 的纯函数在页面中计算；Markdown 渲染仍走 `renderMarkdown`（ADR-001 唯一实现）
- 虚拟模块只被 `prerender = true` 的页面引用，不得进入运行时 Worker 包（构建产物检查）

### 2. 预渲染保持 workerd
不改 `prerenderEnvironment`。理由：middleware 依赖 `cloudflare:workers`；workerd 中的渲染与 Worker spike 已验证一致（ADR-001）。

### 3. 重建：Deploy Hook，失败只记日志
- `src/lib/rebuild/deploy-hook.ts`：`createDeployHookHooks({ url, fetch, waitUntil, log })` 实现 `PublicationHooks`；`onPublicationChanged` 用 `waitUntil(fetch(url, { method: 'POST' }))`，不阻塞接口响应
- `DEPLOY_HOOK_URL` 为 Worker Secret；未配置时返回空实现（本地、E2E）
- 失败（非 2xx、网络错误）记 `console.error('deploy_hook_failed', { status | error })`，**不记录 URL**（含密钥）
- 发布 / 撤回 / 删除三个路由改为注入该钩子；`post` 领域本身不变（钩子已在 F-001 定义）
- 不在应用内合并多次触发：Workers Builds 对同一分支排队构建，连续发布各触发一次，最后一次构建包含全部变化

> 已实现（Sprint 4，add-deploy-hook-rebuild）：`src/lib/rebuild/deploy-hook.ts`、`route-hooks.ts`；发布、撤回、删除三个路由注入。

### 4. 首次部署
README 增加步骤：首次部署时设置构建变量 `READER_BOOTSTRAP=1`（站点上线后删除），并配置 `READER_API_ORIGIN` 为站点自身域名。

## 后果
- 正面：构建只访问线上公开接口一次，不需要 D1 凭据；E2E 用固定夹具，结果确定；预渲染不依赖 workerd 的出网能力
- 负面：文章数 N 时构建发出 ⌈N/20⌉ + N 个请求（千篇以内可接受）；作者改了 `READER_API_ORIGIN` 指向的站点数据，要等下一次构建
- 风险（已由 spike 验证，见"验证结果"；原文，见 feature-architecture §7）：虚拟模块在 workerd 预渲染中可用；预渲染页面的 React island 正常输出；含 `%`、`#` 等编码字符的标签路径能被生成并由静态资源正确命中；404 页静态输出与 `not_found_handling`

## 验证结果（2026-10-15，spike-reader-prerender）

在 `READER_FIXTURE=spike`、`CLOUDFLARE_ENV=e2e` 下 `astro build` + `astro preview` 实测（Astro 7.3.8、`@astrojs/cloudflare` 14.3.4）：

| # | 假设 | 结果 |
|---|------|------|
| ① | `virtual:reader-data` 在 workerd 预渲染中可 import | ✅ `getStaticPaths` 与页面 frontmatter 都能读到数据 |
| ② | 数据与 `renderMarkdown` 不进运行时 Worker 包 | ✅ `dist/server`（不含 `.prerender`）中搜不到夹具标记与 Shiki；只在 `dist/client` 的 HTML 中 |
| ③ | 预渲染页面中 React 岛 | ✅ 输出 `astro-island … ssr client="idle"` 与组件、渲染器脚本 |
| ④ | 标签参数含 `#`、空格、`/`、中文 | ❌ 预先 `encodeURIComponent` 的参数（含 `%2F`）在预渲染时匹配不到静态路径，构建失败 → **采用退路**：`tagSlug` = 小写后把非字母数字（`\p{L}\p{N}`）的连续字符换成 `-` 并去掉首尾 `-`（"C# 与 .NET/Core" → `c-与-net-core`，中文保留）；不同标签得到同一地址时，除篇数最多的一个外追加 `-{6 位哈希}`。实测中文与 `-` 路径生成与访问正常 |
| ⑤ | `404.astro` 预渲染与未知路径 | ✅ 生成 `404.html`；`/nope`、`/media`、`/rss.xml` 返回 404 与该页（适配器的错误页取回机制，无需改 `wrangler.jsonc` 的 `not_found_handling`）；`/admin/posts/1` 未登录仍 302 |
| ⑥ | preview 下读者页走静态资源 | ✅ 静态资源的 `html_handling` 生效（见下条） |
| 附 | 尾斜杠 | 默认目录格式（`posts/hello/index.html`）下 `/posts/hello` 先 307 到带斜杠地址 → `astro.config.mjs` 设 `build: { format: "file" }`：产物为 `posts/hello.html`，`/posts/hello` 直接 200，带斜杠的 307 到不带斜杠；站内链接一律不带尾斜杠 |

自动化：上述检查并入 `check-reader-build-output`（`npm run test:build`）。

## 退路
- 虚拟模块在 workerd 预渲染中不可用 → 插件在 `astro:build:start` 把数据写到 `src/.reader-cache/data.json`，页面用 JSON import
- 标签路径含编码字符不可行 → 标签地址改为"小写名的 URL 安全形式（非 `[a-z0-9-]` 字符用 `-` 连接）+ 冲突时追加短哈希"，更新 TC-US05-03
