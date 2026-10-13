# Markdown 实时预览 验收测试

**US ID**: US-04
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-04-markdown-preview/behaviors.md)
**最后更新**: 2026-10-10
**Version Tag**: v1.0

> 本文件为验收**规格**，非可执行代码；implement 阶段转化为测试代码。
> 预览渲染在浏览器端完成，核心断言放在**共享 Markdown 渲染器**（下称 `renderMarkdown(md) → html`，名称待 design-domain 确定）的单元层，UI 层只验证接线与交互。
> 涉及接口处（加载/保存文章）路径为占位 `GET /api/admin/posts/:id`、`PUT /api/admin/posts/:id`，**接口路径以 design-domain API 契约为准**。

---

## 约定与建议值

| 项 | 取值 | 来源 |
|----|------|------|
| 渲染规则 | GFM（CommonMark + 表格、任务列表、删除线、自动链接；脚注为可选） | story 约束"不支持 MDX" |
| 渲染器 | 预览与读者端（F-002）调用同一模块 | story 约束"同一套渲染规则" |
| 预览更新时限 | 停止输入后 < 300ms（含防抖） | BH-04 / feature-scope 成功指标 |
| 输入不卡顿阈值 | 输入期间主线程无 > 100ms 的 long task | 建议值，待 design-domain 确认 |
| 宽/窄屏断点 | 768px（≥768 并排，<768 Tab） | BH-06 / BH-07 |
| 同步滚动容差 | 目标标题顶部距预览视口顶部 ≤ 预览视口高度的 25% | 建议值，待 design-ui 确认 |

---

## 测试数据策略

| 策略 | 内容 | 隔离方式 |
|------|------|----------|
| **Fixture（共享只读）** | `adminSession`：测试管理员 `admin@test.local` 已登录会话 Cookie，所有页面访问与写调用携带 | 只读 |
| **Fixture（文件，只读）** | `gfm-matrix.md`（TC-US04-01 各行拼接）、`xss-payloads.json`（TC-US04-04 清单）、`long-10k.md`（生成器产出：约 10,000 字，含 20 个 ```ts/```js/```css 代码块轮换、16 个 `##` 二级标题） | 版本化存放于测试目录，只读 |
| **Factory** | `postFactory({body, slug='t-{runId}-{seq}', status='draft'})`：为需要已有正文的 UI 用例创建文章，slug 唯一 | 每用例独立 |
| **Seed（只读）** | 无需额外 Seed（标签 Seed 与 US-03 共用，本 US 不使用） | — |
| **Cleanup** | afterEach 删除本用例 Factory 创建及自动保存产生的文章（按 runId 前缀 + id） | — |

---

## 测试用例列表

| TC ID | covers | 场景 | type | Priority |
|-------|--------|------|------|----------|
| TC-US04-01 | SC-PREVIEW-01 | GFM 渲染矩阵 | unit | P0 |
| TC-US04-02 | SC-PREVIEW-02 | 代码块语法高亮等价类 | unit | P0 |
| TC-US04-03 | SC-PREVIEW-03 | 渲染器 XSS 载荷清单 | security | P0 |
| TC-US04-04 | SC-PREVIEW-03 | 安全内容不被误杀 | unit | P1 |
| TC-US04-05 | SC-PREVIEW-03 | 预览区载荷不执行（浏览器端） | security | P0 |
| TC-US04-06 | SC-PREVIEW-01, SC-PREVIEW-02, SC-PREVIEW-03 | 预览 HTML 与读者端渲染一致 | unit | P0 |
| TC-US04-07 | SC-PREVIEW-04 | 万字 + 20 代码块预览更新 < 300ms | performance | P0 |
| TC-US04-08 | SC-PREVIEW-04 | 长文连续输入不卡顿 | performance | P1 |
| TC-US04-09 | SC-PREVIEW-01 | 输入 GFM 后预览实时更新 | ui-interaction | P0 |
| TC-US04-10 | SC-PREVIEW-02 | 高亮主题随亮/暗模式切换 | ui-interaction | P1 |
| TC-US04-11 | SC-PREVIEW-05 | 空正文显示占位 | ui-interaction | P1 |
| TC-US04-12 | SC-PREVIEW-06 | 宽屏并排与视图切换（含 768 边界） | ui-interaction | P0 |
| TC-US04-13 | SC-PREVIEW-07 | 窄屏 Tab 切换（含 767 边界） | ui-interaction | P1 |
| TC-US04-14 | SC-PREVIEW-08 | 编辑区滚动时预览同步滚动 | ui-interaction | P2 |

---

## TC-US04-01: GFM 渲染矩阵

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-01 |
| covers | SC-PREVIEW-01 |
| Scenario | 各 GFM 语法渲染为预期 HTML 结构 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | unit |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【环境前置】共享渲染器可在 Node/Vitest 中独立调用

**测试数据（参数化，逐行调用渲染器，断言用 DOM 解析而非字符串全等）：**

| # | 语法 | 输入 Markdown | 预期 DOM |
|---|------|--------------|----------|
| 1 | 标题 h1–h6 | `# 标题` … `###### 标题6` | 依次 `h1`…`h6`，文本正确 |
| 2 | 任务列表-未完成 | `- [ ] 任务` | `ul > li` 含 `input[type=checkbox]:not([checked])`，且 `disabled` |
| 3 | 任务列表-已完成 | `- [x] 完成` | `input[type=checkbox][checked][disabled]` |
| 4 | 表格 + 对齐 | `\| a \| b \|\n\|:--\|--:\|\n\| 1 \| 2 \|` | `table > thead > tr > th`×2，`tbody > tr > td`×2；第 1 列左对齐、第 2 列右对齐（`align` 或 `style=text-align`） |
| 5 | 引用 | `> 引用` | `blockquote > p` 文本"引用" |
| 6 | 行内链接 | `[Astro](https://astro.build)` | `a[href="https://astro.build"]` 文本"Astro" |
| 7 | 自动链接 https | `访问 https://example.com 了解` | `a[href="https://example.com"]` |
| 8 | 自动链接 www | `www.example.com` | `a[href="http://www.example.com"]` |
| 9 | 删除线 | `~~删除~~` | `del` 文本"删除" |
| 10 | 图片 | `![图](https://img.test/a.png)` | `img[src="https://img.test/a.png"][alt="图"]` |
| 11 | 有序/嵌套列表 | `1. a\n   - b` | `ol > li > ul > li` |
| 12 | 行内代码 | `` `x<y` `` | `code` 文本 `x<y`（已转义，不产生标签） |
| 13 | 分割线 | `---` | `hr` |
| 14 | 脚注（可选，P2） | `正文[^1]\n\n[^1]: 注释` | 存在 `sup a[href^="#"]` 与脚注区；若 design-domain 决定不支持脚注，本行改为断言原文按普通文本渲染且不报错 |
| 15 | 非 GFM：MDX 组件 | `<Chart data={x} />` | 不作为组件执行；按 HTML 过滤规则处理（不得出现自定义元素执行） |
| 16 | 空输入 | `""` | 返回空字符串，不抛错 |

**步骤：** 对每行调用 `renderMarkdown(input)`，解析为 DOM 后断言

**预期结果：** 按表全部通过

**清理：** 无

---

## TC-US04-02: 代码块语法高亮等价类

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-02 |
| covers | SC-PREVIEW-02 |
| Scenario | 带语言/未知语言/无语言代码块 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | unit |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【环境前置】共享渲染器可独立调用

**测试数据：**

| # | 输入 | 预期 |
|---|------|------|
| 1 | ```` ```ts\nconst a: number = 1;\n``` ```` | `pre > code`，带语言标识（如 `data-language="ts"` 或 `class*="language-ts"`）；`const` 与 `number` 位于独立带颜色/类名的 token 元素中 |
| 2 | ```` ```js ```` / ```` ```css ```` / ```` ```bash ```` | 各自产生 token 元素 |
| 3 | ```` ```foobar\nx\n``` ```` | 不抛错，按纯文本代码块渲染 |
| 4 | ```` ```\nplain\n``` ```` | 纯文本代码块 |
| 5 | ```` ```ts\n</code><script>alert(1)</script>\n``` ```` | 内容被转义为文本，不产生 `script` 元素 |
| 6 | 高亮输出同时含亮/暗两套颜色（CSS 变量或双主题类） | 渲染结果不依赖运行时主题，可由 CSS 切换（实现方式待 design-domain 确认） |

**步骤：** 逐行调用 `renderMarkdown`

**预期结果：** 按表

**清理：** 无

---

## TC-US04-03: 渲染器 XSS 载荷清单

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-03 |
| covers | SC-PREVIEW-03 |
| Scenario | 危险 HTML/URL 经渲染器后被移除或中和 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【环境前置】共享渲染器（含 sanitize 步骤）可独立调用

**测试数据（`xss-payloads.json`）：**

| # | 载荷 | 渲染后断言 |
|---|------|-----------|
| 1 | `<script>alert(1)</script>` | 无 `script` 元素（BH-03 原文） |
| 2 | `<img src=x onerror=alert(1)>` | 无任何 `on*` 属性（BH-03 原文）；`img` 可保留 |
| 3 | `[点我](javascript:alert(1))` | 无 `href` 以 `javascript:` 开头的 `a`（大小写/空白变体：`JaVaScRiPt:`、` javascript:`、`java&#x09;script:`） |
| 4 | `<a href="javascript:alert(1)">x</a>` | 同 #3 |
| 5 | `<iframe src="https://evil.example"></iframe>` | 无 `iframe` |
| 6 | `<svg onload=alert(1)>` / `<svg><script>alert(1)</script></svg>` | 无 `svg[onload]`、无 `script` |
| 7 | `<div style="background:url(javascript:alert(1))">` / `<p style="width:expression(alert(1))">` | 无含 `javascript:` 或 `expression(` 的 `style`（建议：整体移除 `style` 属性，待 design-domain 确认） |
| 8 | `<style>body{display:none}</style>` | 无 `style` 元素 |
| 9 | `<object data=x>` / `<embed src=x>` | 无 `object`、`embed` |
| 10 | `<form action=https://evil.example><input name=p></form>` | 无 `form` |
| 11 | `![x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)` | `img` 的 `src` 不以 `data:text/html` 开头 |
| 12 | `<a href="https://ok.test" target=_blank>` | 若保留 `target=_blank`，必须带 `rel` 含 `noopener` |
| 13 | `<meta http-equiv="refresh" content="0;url=https://evil.example">` | 无 `meta` |
| 14 | `<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>`（mXSS） | 无 `on*` 属性 |

**步骤：** 逐条 `renderMarkdown(payload)`，解析为 DOM 后断言；另用 `DOMPurify`/同等工具的结果作对照（可选）

**预期结果：** 全部断言通过；任一条渲染不抛错

**清理：** 无

---

## TC-US04-04: 安全内容不被误杀

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-04 |
| covers | SC-PREVIEW-03 |
| Scenario | 等价类：合法链接与图片在过滤后保留 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | unit |
| Change History | 2026-10-10 v1.0 初始创建 |

**测试数据：**

| # | 输入 | 预期 |
|---|------|------|
| 1 | `[a](https://a.test/x?y=1&z=2)` | `href` 保留且查询串完整 |
| 2 | `[b](mailto:me@test.local)` | `href="mailto:me@test.local"` |
| 3 | `[c](/posts/hello)` / `[d](#sec)` | 相对路径与锚点保留 |
| 4 | `![r2](https://img.miraclehalcyon.test/2026/10/a.webp)` | `img` 保留 |
| 5 | 文本 `1 < 2 && 3 > 2` | 显示原文字符（以实体转义），不丢失 |

**步骤：** 逐行渲染断言

**预期结果：** 按表

**清理：** 无

---

## TC-US04-05: 预览区载荷不执行（浏览器端）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-05 |
| covers | SC-PREVIEW-03 |
| Scenario | 在真实编辑页输入 XSS 载荷，预览区不执行脚本 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory({body:""})` 创建文章 P；【环境前置】已登录，打开 `/admin/posts/:idP/edit`，视口 1280×800

**测试数据：** `xss-payloads.json` 全部载荷拼接为一篇正文

**步骤：**
1. 注册 `page.on('dialog')` 计数器；在页面注入 `window.__xss = 0`，载荷中 `alert(1)` 替换为 `window.__xss++` 的等价形式
2. 将测试数据粘贴入编辑区，等待 1s
3. 鼠标悬停并点击预览区内所有 `a` 元素（拦截导航）

**预期结果：**
- dialog 计数 = 0，`window.__xss` = 0
- 预览区内 `script`、`iframe`、`object`、`embed`、`[onerror]`、`[onload]`、`a[href^="javascript:" i]` 数量均为 0
- 无对 `https://evil.example` 的网络请求

**playwright_hint：**
```ts
let dialogs = 0; page.on('dialog', d => { dialogs++; d.dismiss(); });
await page.getByTestId('md-editor').locator('[contenteditable], textarea').first().fill(payloads);
const preview = page.getByTestId('md-preview');
await expect(preview.locator('script, iframe, object, embed, [onerror], [onload]')).toHaveCount(0);
expect(dialogs).toBe(0);
```

**清理：** 删除文章 P

---

## TC-US04-06: 预览 HTML 与读者端渲染一致

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-06 |
| covers | SC-PREVIEW-01, SC-PREVIEW-02, SC-PREVIEW-03 |
| Scenario | 同一 Markdown 在预览路径与读者端路径输出相同 HTML（共享渲染器） |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | unit |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【环境前置】预览组件使用的渲染入口与读者端（F-002，Astro 服务端/构建期）使用的渲染入口均可在测试中调用

**测试数据：** `gfm-matrix.md` + `xss-payloads.json` 拼接 + `long-10k.md`

**步骤：**
1. `htmlPreview = previewRenderEntry(md)`
2. `htmlReader = readerRenderEntry(md)`
3. 两者做规范化（属性排序、去除空白文本节点）后比较

**预期结果：**
- 规范化后 `htmlPreview === htmlReader`（三份数据全部成立）
- 静态检查：两入口最终调用同一模块（如同一 `renderMarkdown` 导出），无各自独立的插件配置副本

> F-002 尚未实现时，`readerRenderEntry` 先以共享模块直接调用占位，F-002 落地后切换为真实入口并重跑。

**清理：** 无

---

## TC-US04-07: 万字 + 20 代码块预览更新 < 300ms

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-07 |
| covers | SC-PREVIEW-04 |
| Scenario | 长文末尾输入一个字符后预览在 300ms 内更新 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅（需固定硬件/CPU 节流配置，结果仅在基准环境下判定） |
| type | performance |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】`postFactory({body: long-10k.md})` 创建文章 P
- 【环境前置】Chromium，视口 1280×800，并排视图；基准机器或 CDP CPU 节流 4×（二选一，记录于报告）；打开编辑页后等待首次预览完成

**测试数据：** `long-10k.md`（约 10,000 字，20 个代码块）；输入字符 `x`

**步骤：**
1. 在预览区注册 `MutationObserver`，记录最近一次变更时间
2. 将光标置于正文末尾，记录 `t0 = performance.now()`，键入 `x`
3. 等待预览区末段文本包含 `x`，记录 `t1`
4. 重复步骤 2–3 共 20 次（每次输入新字符），取各次 `t1 - t0`

**预期结果：**
- 20 次中 P95 < 300ms，且最大值 < 300ms × 1.5（容忍偶发抖动，建议值）
- 预览末段最终文本与编辑区一致

**playwright_hint：**
```ts
const ms = await page.evaluate(async () => {
  const preview = document.querySelector('[data-testid="md-preview"]')!;
  const t0 = performance.now();
  // 键入由 Playwright 外部触发，这里只等待
  await new Promise<void>(r => new MutationObserver((_, o) => { if (preview.textContent!.endsWith('x')) { o.disconnect(); r(); } })
    .observe(preview, { subtree: true, childList: true, characterData: true }));
  return performance.now() - t0;
});
expect(ms).toBeLessThan(300);
```

**清理：** 删除文章 P

---

## TC-US04-08: 长文连续输入不卡顿

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-08 |
| covers | SC-PREVIEW-04 |
| Scenario | 长文中连续输入时主线程无长阻塞 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | performance |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 同 TC-US04-07

**测试数据：** 以 50ms 间隔连续键入 `abcdefghijklmnopqrst`（20 字符）

**步骤：**
1. 注册 `PerformanceObserver({type:'longtask'})`
2. 在正文末尾按测试数据键入
3. 停止后等待 500ms

**预期结果：**
- 输入期间无 > 100ms 的 long task（建议阈值）
- 编辑区最终末尾为 `abcdefghijklmnopqrst`（无丢字、无乱序）
- 停止输入后 300ms 内预览末尾同步为该字符串

**清理：** 删除文章 P

---

## UI 交互测试

> 统一前置：浏览器上下文注入 `adminSession` Cookie；除非另注，视口 1280×800。选择器为建议写法，以 design-ui 产出的 `data-testid` 为准（`md-editor`、`md-preview`、`view-toggle`）。

### TC-US04-09: 输入 GFM 后预览实时更新

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-09 |
| covers | SC-PREVIEW-01 |
| Scenario | 编辑页内输入 GFM，预览区渲染对应元素 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory({body:""})` 创建文章 P，打开编辑页

**测试数据：**
```markdown
# 标题
- [ ] 任务
| a | b |
|---|---|
| 1 | 2 |
> 引用
[Astro](https://astro.build)
```

**步骤：** 在编辑区输入测试数据，停止输入

**预期结果（300ms 内）：** 预览区包含 `h1`"标题"、复选框列表项"任务"、`table`（2 列 1 行数据）、`blockquote`"引用"、可点击链接"Astro"（`href="https://astro.build"`）

**playwright_hint：**
```ts
const p = page.getByTestId('md-preview');
await expect(p.getByRole('heading', { level: 1, name: '标题' })).toBeVisible({ timeout: 300 });
await expect(p.getByRole('checkbox')).toHaveCount(1);
await expect(p.getByRole('table')).toBeVisible();
await expect(p.locator('blockquote')).toHaveText('引用');
await expect(p.getByRole('link', { name: 'Astro' })).toHaveAttribute('href', 'https://astro.build');
```

**清理：** 删除文章 P

---

### TC-US04-10: 高亮主题随亮/暗模式切换

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-10 |
| covers | SC-PREVIEW-02 |
| Scenario | ```ts 代码块在亮/暗模式下使用对应高亮配色，且与读者端一致 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory({body:"```ts\nconst a: number = 1;\n```"})` 创建文章 P

**步骤：**
1. `colorScheme: 'light'` 打开编辑页，读取预览区 `const` token 的计算颜色 `cLight`
2. `page.emulateMedia({ colorScheme: 'dark' })`，读取 `cDark`
3. （F-002 可用后）用同样两种模式打开该文章读者端页面（需先发布，或使用读者端渲染的测试页），读取对应 token 颜色

**预期结果：**
- 代码块内存在多个不同颜色的 token（有高亮）
- `cLight ≠ cDark`
- 预览与读者端在同一模式下 token 颜色相同

**playwright_hint：**
```ts
const tok = page.getByTestId('md-preview').locator('pre code span', { hasText: 'const' }).first();
const cLight = await tok.evaluate(e => getComputedStyle(e).color);
await page.emulateMedia({ colorScheme: 'dark' });
await expect.poll(() => tok.evaluate(e => getComputedStyle(e).color)).not.toBe(cLight);
```

**清理：** 删除文章 P

---

### TC-US04-11: 空正文显示占位

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-11 |
| covers | SC-PREVIEW-05 |
| Scenario | 正文为空时预览区显示占位文字；边界：输入后删空 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【环境前置】新建文章页（正文为空）

**步骤：**
1. 查看预览区
2. 在编辑区输入 `a`
3. 删除 `a`
4. 输入 `"   \n\n"`（仅空白）

**预期结果：**
- 步骤 1：显示"在左侧开始写作，这里会显示预览"
- 步骤 2：占位消失，预览显示 `a`
- 步骤 3：占位重新出现
- 步骤 4：显示占位（建议：仅空白视为空，待 design-ui 确认）

**playwright_hint：**
```ts
const ph = page.getByTestId('md-preview').getByText('在左侧开始写作，这里会显示预览');
await expect(ph).toBeVisible();
await editor.pressSequentially('a'); await expect(ph).toBeHidden();
await editor.press('Backspace'); await expect(ph).toBeVisible();
```

**清理：** 若自动保存生成文章则删除

---

### TC-US04-12: 宽屏并排与视图切换（含 768 边界）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-12 |
| covers | SC-PREVIEW-06 |
| Scenario | 视口 ≥ 768px 时左右并排；可切换仅编辑/仅预览/并排 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory({body:"# 保持不变"})` 创建文章 P

**测试数据：** 视口宽度 768 与 1280（高 800）

**步骤（每个宽度各执行一遍）：**
1. 打开 `/admin/posts/:idP/edit`
2. 点击视图切换"仅编辑"
3. 点击"仅预览"
4. 切回并排视图

**预期结果：**
- 步骤 1：编辑区与预览区均可见，预览区左边界 ≥ 编辑区右边界（左右并排），二者顶部 y 坐标相同
- 步骤 2：预览区隐藏，编辑区宽度 ≈ 容器宽度（误差 ≤ 2px）
- 步骤 3：编辑区隐藏，预览区可见，内容为 `h1`"保持不变"
- 步骤 4：恢复并排；编辑区内容仍为 `# 保持不变`（切换不丢内容）

**playwright_hint：**
```ts
await page.setViewportSize({ width: 768, height: 800 });
const ed = await page.getByTestId('md-editor').boundingBox();
const pv = await page.getByTestId('md-preview').boundingBox();
expect(pv!.x).toBeGreaterThanOrEqual(ed!.x + ed!.width - 1);
await page.getByRole('button', { name: '仅编辑' }).click();
await expect(page.getByTestId('md-preview')).toBeHidden();
```

**清理：** 删除文章 P

---

### TC-US04-13: 窄屏 Tab 切换（含 767 边界）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-13 |
| covers | SC-PREVIEW-07 |
| Scenario | 视口 < 768px 时以 Tab 切换编辑与预览 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory({body:"# 窄屏预览"})` 创建文章 P

**测试数据：** 视口 767×800 与 375×667

**步骤（每个尺寸各一遍）：**
1. 打开编辑页
2. 点击"预览" Tab
3. 点击"编辑" Tab

**预期结果：**
- 步骤 1：存在"编辑""预览"两个 Tab，默认选中"编辑"（`aria-selected=true`），编辑区可见、预览区不可见；页面无横向滚动条
- 步骤 2：预览区显示 `h1`"窄屏预览"，编辑区不可见
- 步骤 3：回到编辑区，内容 `# 窄屏预览` 未丢失

**playwright_hint：**
```ts
await page.setViewportSize({ width: 767, height: 800 });
await expect(page.getByRole('tab', { name: '编辑' })).toHaveAttribute('aria-selected', 'true');
await page.getByRole('tab', { name: '预览' }).click();
await expect(page.getByTestId('md-preview').getByRole('heading', { level: 1 })).toHaveText('窄屏预览');
expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
```

**清理：** 删除文章 P

---

### TC-US04-14: 编辑区滚动时预览同步滚动

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-14 |
| covers | SC-PREVIEW-08 |
| Scenario | 编辑区滚到第 3 个二级标题，预览区滚到对应标题附近 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅（阈值敏感，失败时需人工复核截图） |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】`postFactory({body: long-10k.md})` 创建文章 P（含 16 个 `##` 标题，各节长度不等）；【环境前置】1280×800 并排视图

**步骤：**
1. 打开编辑页，编辑区滚动至第 3 个 `## ` 行位于编辑视口顶部
2. 等待 300ms
3. 再滚动至第 10 个 `## ` 行，等待 300ms
4. 滚回顶部，等待 300ms

**预期结果：**
- 步骤 2：预览区第 3 个 `h2` 顶部与预览视口顶部距离 ≤ 视口高度 25%（建议容差）
- 步骤 3：第 10 个 `h2` 同上
- 步骤 4：预览区 `scrollTop` ≤ 10px
- 滚动预览区不导致编辑区光标位置改变（反向同步是否需要以 design-ui 为准，本 TC 不强制）

**playwright_hint：**
```ts
// 通过编辑器 API 或定位第 3 个 "## " 行后 scrollIntoView
await editor.evaluate(el => /* scroll to 3rd h2 line */ void 0);
const h2 = page.getByTestId('md-preview').locator('h2').nth(2);
await expect.poll(async () => {
  const [pv, h] = await Promise.all([page.getByTestId('md-preview').boundingBox(), h2.boundingBox()]);
  return Math.abs(h!.y - pv!.y) / pv!.height;
}).toBeLessThanOrEqual(0.25);
```

**清理：** 删除文章 P

---

## 覆盖矩阵

| SC-ID | Behavior | TC-IDs |
|-------|----------|--------|
| SC-PREVIEW-01 | BH-01 | TC-US04-01, TC-US04-06, TC-US04-09 |
| SC-PREVIEW-02 | BH-02 | TC-US04-02, TC-US04-06, TC-US04-10 |
| SC-PREVIEW-03 | BH-03 | TC-US04-03, TC-US04-04, TC-US04-05, TC-US04-06 |
| SC-PREVIEW-04 | BH-04 | TC-US04-07, TC-US04-08 |
| SC-PREVIEW-05 | BH-05 | TC-US04-11 |
| SC-PREVIEW-06 | BH-06 | TC-US04-12 |
| SC-PREVIEW-07 | BH-07 | TC-US04-13 |
| SC-PREVIEW-08 | BH-08 | TC-US04-14 |

**Story 验收标准追溯**：AC1→TC-01/07/09；AC2→TC-02/06/10；AC3→TC-03/04/05；AC4→TC-12；AC5→TC-13；AC6→TC-14；约束"与读者端同一套渲染规则"→TC-06/10。

**NFR 追溯**：内容渲染防 XSS→TC-03/05；亮/暗模式→TC-10；移动端可用→TC-13；成功指标"预览延迟 < 300ms"→TC-07。

**Gap 检查**：behaviors.md SC-ID 集合 {SC-PREVIEW-01 … SC-PREVIEW-08}（8 个）与本文件 covers 集合求差 = ∅。

**Gap: 无**

---

## 执行记录

| 日期 | 执行人 | 结果 | 备注 |
|------|--------|------|------|
| — | — | ⏳ | 待 implement 阶段转化执行 |

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | v1.0 | 初始创建 | AI（design-acceptance） |
