# markdown 模块（同构渲染）

**最后更新**: 2026-10-19
**状态**: self-checked
**来源**: [ADR-001](../../../features/F-001-文章写作/architecture/adr/ADR-001-isomorphic-markdown.md) · [ADR-005](../../../features/F-001-文章写作/architecture/adr/ADR-005-self-describing-image-markdown.md) · feature-architecture §6.3
**位置**: `src/lib/markdown/`
**使用方**: 后台预览（浏览器 Web Worker）、F-002 读者页（构建时预渲染）

---

## 1. 接口

```ts
export interface RenderOptions {
  sourceMap?: boolean;               // 预览传 true：输出源码位置属性
  uploadPlaceholders?: boolean;      // 预览传 true：上传占位输出为挂载点；默认（读者页）删除占位
}
export interface RenderResult { html: string; images: ImageRef[] }
export async function renderMarkdown(source: string, opts?: RenderOptions): Promise<RenderResult>;

export interface ImageRef {          // 预览用于挂载 ArticleImage / ImageGallery
  id: string;                        // 渲染内序号 "img-0"
  src: string; alt: string; title?: string;
  w?: number; h?: number; rgb?: string;
  thumb?: string; mp?: { offset: number; size: number };   // 登记前缀下的外链照片（ADR-010）
  marks: { wide: boolean; live: boolean; accordion: boolean };
  sourceStart: number; sourceEnd: number;   // 图片语法在源码中的字符偏移
}

// 纯函数，编辑器的图片菜单也会用到
export function parseImageKey(url: string): { w: number; h: number; rgb: string } | null;
export function parseMarks(url: string): { wide: boolean; live: boolean; accordion: boolean };
// 外链照片（ADR-010，plugins/external-photo.ts）：storage 为 site.afilmory.storage
export function parseExternalPhoto(url: string, storage: string | undefined):
  { w: number; h: number; rgb: string; thumb: string; mp?: { offset: number; size: number } } | null;
export function thumbnailFor(url: string, storage: string): string | null;
```

## 2. 处理链

> 原型已实现（spike-markdown-workers-runtime）：remark-parse → remark-gfm → remark-rehype → 语言白名单 → rehype-expressive-code；其余步骤由后续任务补齐。

```
remark-parse → remark-gfm → [remarkImageGroups] → remark-rehype(allowDangerousHtml) → rehype-raw
  → rehype-sanitize(schema) → rehypeAfterSanitize → [rehypeImageFigures] → [rehypeSourceLines 记录] → rehype-expressive-code → [rehypeSourceLines 写回] → rehype-stringify
```

| 步骤 | 说明 |
|------|------|
| `remarkImageGroups` | 段落子节点只有 image 和空白文本，且 image ≥ 2 → 标记为组图；每 9 张切一组，剩 1 张退化为单图；首张带 `#accordion` 且组内 3–7 张 → accordion，否则 grid。已实现：判定与 `rehypeImageFigures` 合并在 sanitize 之后的 hast 上进行（`plugins/image-figures.ts`），因为 sanitize 会去掉 remark 阶段打的 `data-*`；只处理 Markdown 语法的图片（源码偏移处为 `!`），原始 HTML 的 `<img>` 不处理；混有文字的段落中，独占一行的图片拆出为单图，行内图片保持行内 |
| `rehype-sanitize` | 基于 GitHub schema：去掉 `script`、`style`、所有 `on*` 属性、`javascript:`/`data:`（`img` 的 `data:image/*` 除外）链接；保留代码块 `class="language-*"` |
| `rehype-raw` | Markdown 中的原始 HTML 解析为 hast 后交给 sanitize（与 GitHub 一致：允许安全的原始 HTML） |
| `rehypeAfterSanitize` | `src` 的 `data:` 只保留 `data:image/*`；sanitize 给 id 加 `user-content-` 前缀，脚注页内链接同步加前缀（remark-rehype 不再加前缀，避免双重前缀） |
| `rehypeImageFigures` | sanitize 之后执行，只生成白名单属性（下表），因此不会引入可注入内容。已实现：`src/lib/markdown/plugins/image-figures.ts`（在上传占位之后、`rehypeSourceLines` 之前）；`parseImageKey` / `parseMarks` 在 `plugins/image-key.ts`，经 `render.ts` 导出 |
| `rehype-expressive-code` | Shiki 使用 JavaScript 正则引擎；语言白名单：ts、tsx、js、jsx、json、bash、shell、css、html、md、yaml、toml、sql、python、go、rust、diff；主题跟随站点亮 / 暗主题（两套主题，CSS 变量切换）。已实现：`src/lib/markdown/ec-config.ts`——github-light 为基础主题，选择器按主题类型生成 `[data-theme='light|dark']`，系统暗色经 `prefers-color-scheme` 媒体查询切换 |
| `rehypeQuoteAttribution`（F-002，已实现：`plugins/quote-attribution.ts`，在 `rehypeAfterSanitize` 之后） | sanitize 之后、`rehypeImageFigures` 之前：`blockquote` 有 ≥ 2 个直接子级 `p`，且最后一个 `p` 的文本以"— "（U+2014 + 空格）或"—— "开头 → 该 `p` 换成 `<footer data-attribution>`（内容不变，含开头破折号）；单段引用、`-- `、无空格、非最后一段都不处理。只生成白名单属性。文件 `plugins/quote-attribution.ts`。预览与读者页同时生效 |
| `rehypeSourceLines` | 仅 `sourceMap: true`：顶层块级元素加 `data-line`（源码起始行，供同步滚动）。已实现：`src/lib/markdown/plugins/source-lines.ts`——EC 会替换顶层 `<pre>`，故先记录后写回；开关经 `file.data.sourceMap` |

> 已实现（implement-markdown-gfm-render）：GFM 处理链与 `RenderOptions` 签名；脚注区无障碍文案为中文（标题「脚注」、回链「返回引用 N」）。
> 已实现（implement-markdown-sanitize）：`src/lib/markdown/sanitize-schema.ts`。注意：Expressive Code 在每个代码块内输出自带的 `<style>` 与复制按钮 `<script type="module">`，预览区（TC-US04-05 断言无 script）需处理。

### 2.1 上传占位（`rehypeUploadPlaceholders`）

占位 = Markdown 图片语法、URL 为空、alt 为"处理中…"/"上传中…"/"上传失败"之一。在 sanitize 之后、`rehypeImageFigures` 之前处理：

| 模式 | 输出 |
|------|------|
| `uploadPlaceholders: true`（预览） | `[data-upload-placeholder="processing\|uploading\|failed"][data-placeholder-index="{按出现顺序的序号}"]`，由 `MarkdownPreview` 挂载 `UploadCard`。所在段落只有占位时整段替换为 `div`（多个占位各一个，第一个继承段落的源码位置），否则为行内 `span`（不留空 `p`） |
| 默认（读者页、RSS 等） | 删除占位节点；删除后段落为空（只剩空白）则删除段落。不输出任何文字、`img` 或 `data-upload-placeholder`（US-05 AC10） |

> 已实现（Sprint 6，strip-reader-upload-placeholders）：`src/lib/markdown/plugins/upload-placeholder.ts`，开关经 `file.data.uploadPlaceholders`；预览 Worker 传 true。2026-10-16 前预览与读者页都把占位渲染为"图片上传中…"块。

## 3. 图片输出结构

**单图**
```html
<figure data-article-image data-src="/img/…jpg" data-w="1600" data-h="900" data-rgb="556677"
        data-wide data-live data-source-start="120" data-source-end="171">
  <img src="/img/…jpg" alt="山" width="1600" height="900" loading="lazy" decoding="async">
  <figcaption>图注</figcaption>
</figure>
```

**组图**
```html
<div data-gallery="grid" data-count="6" data-source-start="…" data-source-end="…">
  <figure data-article-image …>…</figure> …
</div>
```

| 规则 | 说明 |
|------|------|
| 解析失败 | `parseImageKey` 返回 null（外链、文件名不符）→ 不输出 `data-w`/`data-h`/`data-rgb`、`img` 不带宽高 |
| 标记 | URL 片段按 `,` 拆分，只认小写 `wide`、`live`、`accordion`，其余忽略；输出 `src` 时去掉片段 |
| `live` | 站内 `/img/` 路径：视频地址 = 图片地址去扩展名 + `.live.mp4`（由组件推导，不写入 HTML）；外链照片：只在有合法 `mp=` 时生效；其余外链忽略 |
| 外链照片（[ADR-010](../../../features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)） | `src`（去片段）以 `site.afilmory.storage` 开头（`new URL` 规范化后比较，含 `..` 的路径不认）且 `ext=` 合法 → figure 加 `data-w` / `data-h` / `data-rgb`、`data-thumb`（`thumbnailFor`）、有合法 `mp=` 时 `data-mp="{offset}+{size}"`；`img[src]` 为缩略图、带宽高；`data-src` 仍为原图。`ext=` 不合法 → 按普通外链；`mp=` 不合法 → 只忽略 mp（及 live）。已实现（Sprint 8 任务 2）：`plugins/external-photo.ts`，`rehypeImageFigures` 从 `src/config/site.ts` 取前缀。与文字同段的行内外链照片同样把 `img[src]` 换成缩略图（verify 发现：原图可能含几十 MB 的内嵌视频） |
| 图注 | 只来自 Markdown title；转义后作为文本 |
| 无 JS 降级 | 输出本身就是可读的 `figure` + `img`；React 组件挂载是增强 |
| 源码位置属性 | 仅 `sourceMap: true` 时输出 `data-source-start`/`data-source-end` |

## 4. 运行环境

| 环境 | 加载方式 |
|------|---------|
| 后台预览 | `src/lib/markdown/worker.ts` 作为 Web Worker（Vite `?worker`，已实现）；主线程发送 `{ seq, source }`，Worker 回 `{ seq, html, images }`，只采用最新 `seq` 的结果；首次进入写文章页预热。渲染出错时 Worker 回 `{ seq, error: true }`（不吞掉请求），主线程照常复位"渲染中"、发出排队的输入，并保留上次结果显示错误提示（US-04 BH-09，已实现）。已实现：`src/components/admin/editor/MarkdownPreview.tsx`（渲染中又有输入时只保留最后一次；Expressive Code 的 style / 复制脚本提到 `<head>` 只加载一次；单图 `figure` 换成宿主元素并 portal 渲染 `ArticleImage`，组图 `div[data-gallery]` 同样渲染为 `ImageGallery`；重新渲染时按 `src/lib/markdown/reconcile-islands.ts` 复用未变的实例——单图按 src 与标记，组图按模式 + 组内各图的 src 与标记）。Worker 中无 `document`：`decode-named-character-reference` 经 alias 使用非 DOM 入口（见 `astro.config.mjs`） |
| F-002 构建时 | 预渲染页面（workerd）中直接 import；不进入线上 Worker 包（构建产物检查，ADR-007） |

## 5. 性能目标

| 指标 | 目标 | 验证 |
|------|------|------|
| 浏览器 Web Worker 渲染 10,000 字含 10 个代码块 | P95 < 200ms（留 100ms 给传输与挂载，满足 US-04 的 300ms） | ✅ 实测 P95 25–30ms（含传输），worker 入口 chunk gzip 176 KiB（[ADR-001 验证结果](../../../features/F-001-文章写作/architecture/adr/ADR-001-isomorphic-markdown.md)） |
| WebKit 首次遇到新语法 | 不超过 300ms | Shiki 按需编译语法规则：WebKit 首次遇到类型注解等写法时近 1 秒，之后约 110ms（10k 字 P95 48ms）；预热样例覆盖常见 TS 写法与 GFM 后首次编辑 100–150ms（build-markdown-preview-pane） |
| Worker 打包体积 | 渲染模块不进入线上 Worker 包（读者页构建时渲染）；后台 chunk 不进入读者页 | 若退回 Worker SSR：已验证在付费版 10MB 限额内，合并构建 gzip 2,299 KiB（[ADR-001 验证结果](../../../features/F-001-文章写作/architecture/adr/ADR-001-isomorphic-markdown.md)） |

## 6. 单元测试规格

| UT-ID | 用例 | 预期 |
|-------|------|------|
| MD-UT-01 | GFM 全集：标题、列表、表格、任务列表、删除线、自动链接、脚注 | 与快照一致 |
| MD-UT-02 | XSS 向量集（`<script>`、`<img onerror>`、`javascript:` 链接、`<iframe>`、SVG 内联、`style`） | 输出不含可执行内容 |
| MD-UT-03 | 代码块 `ts` 与未知语言 `foo` | 前者高亮；后者按纯文本输出，不报错 |
| MD-UT-04 | 图片插件 | 见 [frontend-unit-tests.md](../../../../test/features/F-001-文章写作/unit/frontend-unit-tests.md) UT-126 – UT-133（已实现：`tests/unit/markdown/image-plugins.test.ts`） |
| MD-UT-05 | `sourceMap` | 每个顶层块级元素 `data-line` 与源码起始行一致；关闭时不输出（已实现：`tests/unit/editor/scroll-sync.test.ts`） |
| MD-UT-07 | `rehypeQuoteAttribution` | 末段 `— 鲁迅`、`—— 鲁迅` → `footer[data-attribution]`；`-- 鲁迅`、`—鲁迅`、署名在中间段、只有一段 `— 鲁迅` → 保持 `p`；署名段内含 `<script>` 仍被 sanitize 去除（TC-US07-09） |
| MD-UT-06 | 同一输入在 Node 与 Worker 环境渲染 | 输出字节一致（同构保证）。已实现：jsdom 单元测试写出快照 `tests/unit/markdown/__snapshots__/images-sample.html`，workerd 集成测试（`tests/integration/markdown/isomorphic.test.ts`）与之逐字节比对 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
| 2026-10-13 | 1.1 | spike 结果回写；F-002 使用方式改为构建时预渲染（ADR-001 修订） | miraclehifi |
| 2026-10-13 | 1.2 | 浏览器 Web Worker spike 结果回写；worker.ts 已实现 | miraclehifi |
| 2026-10-13 | 1.3 | 预览区已实现；WebKit 首次编译语法规则的耗时与预热处理 | miraclehifi |
| 2026-10-14 | 1.4 | `rehypeSourceLines` 已实现（顶层块，记录 / 写回两步） | miraclehifi |
| 2026-10-14 | 1.5 | 图片插件已实现：组图判定改在 sanitize 之后进行；混有文字段落的拆分规则 | miraclehifi |
| 2026-10-14 | 1.6 | §4：Worker 回传 `images`；预览单图挂载与 `reconcileIslands`（add-article-image-display） | miraclehifi |
| 2026-10-15 | 1.7 | F-002：新增 `rehypeQuoteAttribution`（引用署名）与 MD-UT-07 | miraclehifi |
| 2026-10-16 | 1.8 | 新增 §2.1 上传占位：`RenderOptions.uploadPlaceholders`，预览输出挂载点、读者端删除占位（[media-upload-experience](../../../../backlog/media-upload-experience.md)） | miraclehifi |
| 2026-10-19 | 1.9 | 外链照片：`parseExternalPhoto` / `thumbnailFor`、`ImageRef.thumb` / `mp`、输出 `data-thumb` / `data-mp`（[ADR-010](../../../features/F-001-文章写作/architecture/adr/ADR-010-external-photo-storage.md)） | miraclehifi |
