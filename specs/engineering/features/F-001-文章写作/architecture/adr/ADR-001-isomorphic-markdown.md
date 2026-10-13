# ADR-001: Markdown 同构渲染

## 状态
Accepted（2026-10-12）

## 背景
US-04 要求预览在 300ms 内更新，并且与读者端（F-002）渲染完全一致。Expressive Code 依赖 Shiki，体积大，能否在 Cloudflare Workers 里运行还没有验证过。

## 决策
- `src/lib/markdown/render.ts` 是唯一的渲染实现，处理链为 unified + remark-gfm + rehype-sanitize + rehype-expressive-code + 图片插件。
- 后台预览在浏览器 **Web Worker** 中运行这个模块，按需加载，只在后台使用，不经过网络。
- F-002 读者端在 Worker SSR 中运行同一模块，加边缘缓存。Shiki 使用 JavaScript 正则引擎（不用 Oniguruma WASM），语言按白名单精简。
- Sprint 1 第一个任务是验证（spike），确认三件事：浏览器端万字文章渲染 < 300ms；Worker 打包体积在限额内；Worker 内单次渲染的 CPU 时间可以接受。

## 退路
如果 Worker 侧不可行：改为发布时渲染，把 HTML 存入 `posts.published_html`。渲染发生在 Worker 里一次性的发布请求中，或由浏览器渲染后提交，再由服务端二次 sanitize。预览部分不受影响。

## 验证结果（Worker 侧，2026-10-13，spike-markdown-workers-runtime）

**结论：通过**，状态保持 Accepted，不启用退路。浏览器侧（万字 < 300ms）由 `spike-markdown-browser-worker` 验证。

原型：`src/lib/markdown/render.ts`（remark-parse → remark-gfm → remark-rehype → 语言白名单 → rehype-expressive-code 0.44，Shiki 4.5 JavaScript 正则引擎，github-dark / github-light 双主题）。

| 项目 | 结果 | 判定 |
|------|------|------|
| workerd 中运行（vitest workers 项目） | 输出 `.expressive-code` 结构与 `--0/--1` 双主题着色 span | ✅ |
| 生产构建在 workerd 中运行（`astro build` + `astro preview`，临时端点） | 200，结构与着色同上 | ✅ |
| 打包体积：仅渲染模块（`wrangler deploy --dry-run --outdir dist-check`） | 11,253 KiB / gzip 1,938 KiB | — |
| 打包体积：Astro 现有产物（基线） | 1,206 KiB / gzip 282 KiB | — |
| 打包体积：Astro + 渲染模块（实际合并构建） | 13,156 KiB / **gzip 2,299 KiB** | ✅ ≤ 10MB（也低于免费版 3MB） |
| 单次渲染：小代码块 | 冷 139–289ms（Shiki 初始化 + 加载语法），热 1–2ms | ✅ < 50ms |
| 单次渲染：25k 字符 + 10 个代码块（10 种语言） | 冷 323ms，热 57–66ms | 可接受（读者端按 `contentHash` 缓存） |

**发现与约束**：

- 热渲染长文约 60ms CPU，超出 Workers 免费版 10ms CPU 上限 → 读者 SSR 依赖 **Workers 付费版**（与 module-spec §5 的付费版假设一致），且必须保留边缘缓存。
- `@expressive-code/plugin-shiki` 静态引入 `shiki/langs`，全部语法都会进包（原始体积大头）；语言白名单只能在运行时生效（非白名单语言降级为纯文本）。如需瘦身，可在构建时把 `shiki/langs` 别名到只含白名单的模块（可选优化，不阻塞）。
- 测试环境：postcss（Expressive Code 依赖）在 vitest-plugin 的 CJS 回退中 `require("nanoid/non-secure")` 会拿到 ESM 入口，`vitest.config.ts` 顶层用 `resolve.alias` 指向其 `.cjs` 入口；生产打包不受影响。

## 后果
- 正面：预览不依赖网络，延迟最低；只有一份渲染规则。
- 负面：后台首次进入写文章页要下载高亮器（约数百 KB，可缓存）；读者端是否可行取决于 spike 结果。
