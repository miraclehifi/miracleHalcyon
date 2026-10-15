# 文章正文渲染与阅读排版 验收测试

**US ID**: US-07
**Story**: [story.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-reading/US-07-article-typography/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-reading/US-07-article-typography/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.0

> 验收规格（非可执行代码）。数据见 [_fixtures.md](../_fixtures.md) `reader-fixture`；排版令牌以 design-ui 与 [design-tokens.md](../../../../../ui/design-tokens.md) 为准。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US07-01 | SC-ARTICLE-01 | 读者页正文与预览同一渲染 | P0 | integration |
| TC-US07-02 | SC-ARTICLE-01 | 详情页正文结构 | P0 | e2e |
| TC-US07-03 | SC-ARTICLE-02 | 代码高亮随主题切换 | P1 | ui-interaction |
| TC-US07-04 | SC-ARTICLE-03 | 标题区日期、更新于与标签 | P0 | e2e |
| TC-US07-05 | SC-ARTICLE-03 | 更新于判断纯函数 | P2 | unit |
| TC-US07-06 | SC-ARTICLE-04 | 段首缩进与首字下沉 | P0 | ui-interaction |
| TC-US07-07 | SC-ARTICLE-05 | 首段不是文字时不下沉 | P1 | ui-interaction |
| TC-US07-08 | SC-ARTICLE-06 | 引用署名 | P1 | ui-interaction |
| TC-US07-09 | SC-ARTICLE-06 | 署名识别规则 | P1 | unit |
| TC-US07-10 | SC-ARTICLE-07 | 正文 HTML 清洗 | P0 | security |
| TC-US07-11 | SC-ARTICLE-08 | 草稿 slug 与不存在 slug 404 | P0 | e2e |

---

## 功能 / 接口测试

### TC-US07-01: 读者页正文与预览同一渲染

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-01 |
| covers | SC-ARTICLE-01 |
| Scenario | 读者页正文与预览同一渲染 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | integration |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 对 `hello` 正文分别调用构建时渲染入口与预览 Web Worker 使用的 `renderMarkdown`，比较输出

**预期结果：**
- HTML 完全一致（同一实现，MD-UT-06 同构）
- 包含 `table`、任务列表 `input[type=checkbox][disabled]`、`del`、带高亮的 ts 代码块

**清理：** 无（只读夹具）

---

### TC-US07-02: 详情页正文结构

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-02 |
| covers | SC-ARTICLE-01 |
| Scenario | 详情页正文结构 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/posts/hello`

**预期结果：**
- `h1` 为 Hello Halcyon（正文中 Markdown 的 h1 降级不与页面标题冲突，以 design-ui 为准）
- 正文含 3 个 `h2`、2 个 `h3`，各带 `id` 锚点
- 代码块含语法高亮 token 元素

**清理：** 无（只读夹具）

---

### TC-US07-04: 标题区日期、更新于与标签

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-04 |
| covers | SC-ARTICLE-03 |
| Scenario | 标题区日期、更新于与标签 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/posts/hello` 与 `/posts/prev-post`

**预期结果：**
- hello：`time[datetime="2026-10-10"]` 文本"2026-10-10"；"更新于 2026-10-12"；标签链接 `#Astro`、`#Cloudflare`
- prev-post：无"更新于"

**清理：** 无（只读夹具）

---

### TC-US07-05: 更新于判断纯函数

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-05 |
| covers | SC-ARTICLE-03 |
| Scenario | 更新于判断纯函数 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | unit |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**测试数据：**

| 字段 | 值 |
|------|------|
| 输入 | `publishedAt '2026-10-10'` 与 `lastPublishedAt` 为 `2026-10-10T08:00:00.000Z` / `2026-10-12T01:00:00.000Z` / `null` |

**步骤：**
1. 调用 `updatedDate(post)`

**预期结果：**
- 同一天 → null；晚于发布日期 → `2026-10-12`；null → null（按 UTC 日期比较，以 design-domain 为准）

**清理：** 无（只读夹具）

---

### TC-US07-09: 署名识别规则

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-09 |
| covers | SC-ARTICLE-06 |
| Scenario | 署名识别规则 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | unit |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**测试数据：**

| 字段 | 值 |
|------|------|
| 输入 | 最后一段 `— 鲁迅`、`—— 鲁迅`、`-- 鲁迅`、`—鲁迅`（无空格）、署名在中间段、引用只有一段 `— 鲁迅` |

**步骤：**
1. 对各 Markdown 调用渲染并检查 blockquote

**预期结果：**
- 前两种识别为署名；`-- `、无空格、非最后一段不识别
- 只有一段且为署名时不识别（避免整段变署名）
- 识别规则在预览与读者页一致（同一插件）

**清理：** 无（只读夹具）

---

### TC-US07-10: 正文 HTML 清洗

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-10 |
| covers | SC-ARTICLE-07 |
| Scenario | 正文 HTML 清洗 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】构建夹具额外一篇已发布文章（只在本用例的构建单元测试中），正文含 `<script>alert(1)</script>`、`<img src=x onerror=alert(1)>`、`[x](javascript:alert(1))`

**步骤：**
1. 调用构建时渲染，检查输出

**预期结果：**
- 无 `script`、无 `on*` 属性、无 `javascript:` 链接（沿用 F-001 MD 清洗规则）

**清理：** 无（只读夹具）

---

### TC-US07-11: 草稿 slug 与不存在 slug 404

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-11 |
| covers | SC-ARTICLE-08 |
| Scenario | 草稿 slug 与不存在 slug 404 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**测试数据：**

| 字段 | 值 |
|------|------|
| 路径 | `/posts/draft-post`、`/posts/withdrawn-post`、`/posts/nope`、`/posts/Hello`（大小写不符） |

**步骤：**
1. 逐个访问

**预期结果：**
- 均为 404 页

**清理：** 无（只读夹具）

---

## UI 交互测试

### TC-US07-03: 代码高亮随主题切换

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-03 |
| covers | SC-ARTICLE-02 |
| Scenario | 代码高亮随主题切换 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】亮色

**步骤：**
1. 读取代码块背景色；切换为暗色后再读

**预期结果：**
- 两次背景色不同，且分别等于亮 / 暗代码主题背景；无需刷新

**playwright_hint：**
```ts
const pre = page.locator('article pre').first();
const before = await pre.evaluate(e => getComputedStyle(e).backgroundColor);
```

**清理：** 无（只读夹具）

---

### TC-US07-06: 段首缩进与首字下沉

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-06 |
| covers | SC-ARTICLE-04 |
| Scenario | 段首缩进与首字下沉 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 读取正文首段、普通段落、列表、引用、代码块、图片 figure、表格的 `text-indent`；读取首段 `::first-letter` 的 `float` 与字号

**预期结果：**
- 普通段落 `text-indent` = 2em
- 列表项、引用内段落、代码块、figure、表格单元格为 0
- 首段首字 `float: left`，字号约为正文 2.4 倍；其他段落无下沉

**playwright_hint：**
```ts
const indent = await page.locator('article .prose > p').nth(1).evaluate(e => getComputedStyle(e).textIndent);
const drop = await page.locator('article .prose > p').first().evaluate(e => getComputedStyle(e, '::first-letter').cssFloat);
```

**清理：** 无（只读夹具）

---

### TC-US07-07: 首段不是文字时不下沉

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-07 |
| covers | SC-ARTICLE-05 |
| Scenario | 首段不是文字时不下沉 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/posts/first-post`（以图片开头）

**预期结果：**
- 没有任何元素的 `::first-letter` 为 `float: left`（下沉只作用于"正文第一个元素是段落"的情况）

**playwright_hint：**
```ts
await expect(page.locator('[data-dropcap]')).toHaveCount(0);
```

**清理：** 无（只读夹具）

---

### TC-US07-08: 引用署名

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-08 |
| covers | SC-ARTICLE-06 |
| Scenario | 引用署名 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 读取 `hello` 中的引用

**预期结果：**
- 最后一段"— 鲁迅"为署名元素（`footer` 或 `cite`），`text-align: right`
- 引用带装饰引号（`::before` 内容为“ 或装饰元素 `aria-hidden`）

**清理：** 无（只读夹具）

---

## 覆盖矩阵

| SC-ID | TC |
|-------|----|
| SC-ARTICLE-01 | TC-US07-01, TC-US07-02 |
| SC-ARTICLE-02 | TC-US07-03 |
| SC-ARTICLE-03 | TC-US07-04, TC-US07-05 |
| SC-ARTICLE-04 | TC-US07-06 |
| SC-ARTICLE-05 | TC-US07-07 |
| SC-ARTICLE-06 | TC-US07-08, TC-US07-09 |
| SC-ARTICLE-07 | TC-US07-10 |
| SC-ARTICLE-08 | TC-US07-11 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
