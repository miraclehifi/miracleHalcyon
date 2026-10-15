# 文章列表 /posts 验收测试

**US ID**: US-04
**Story**: [story.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-04-post-list/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-04-post-list/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.0

> 验收规格（非可执行代码）。数据见 [_fixtures.md](../_fixtures.md) `reader-fixture`。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US04-01 | SC-BROWSE-01 | 按发布日期倒序与总数 | P0 | e2e |
| TC-US04-02 | SC-BROWSE-02 | 卡片内容与链接 | P0 | e2e |
| TC-US04-03 | SC-BROWSE-03 | 摘要来源与纯文本截取 | P0 | unit |
| TC-US04-04 | SC-BROWSE-03 | 摘要最多 3 行 | P2 | ui-interaction |
| TC-US04-05 | SC-BROWSE-04 | 封面显示与无封面布局 | P1 | ui-interaction |
| TC-US04-06 | SC-BROWSE-05 | 分页导航 | P0 | ui-interaction |
| TC-US04-07 | SC-BROWSE-06, SC-BROWSE-07 | 非法页码 404 | P1 | e2e |
| TC-US04-08 | SC-BROWSE-08 | 空列表 | P1 | build |
| TC-US04-09 | SC-BROWSE-09 | 悬停错位、触屏与减弱动效 | P2 | ui-interaction |

---

## 功能 / 接口测试

### TC-US04-01: 按发布日期倒序与总数

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-01 |
| covers | SC-BROWSE-01 |
| Scenario | 按发布日期倒序与总数 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/posts`，读取卡片标题顺序与页头

**预期结果：**
- 前 4 张依次为 Latest Post、Hello Halcyon、Prev Post、Case Lower
- 不出现 Withdrawn、Draft
- 页头显示"41 篇文章"

**清理：** 无（只读夹具）

---

### TC-US04-02: 卡片内容与链接

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-02 |
| covers | SC-BROWSE-02 |
| Scenario | 卡片内容与链接 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 读取 Hello Halcyon 卡片；点击卡片标题；返回后点击 `#Astro`

**预期结果：**
- 卡片含标题、"手写摘要"、日期"2026-10-10"、`#Astro`、`#Cloudflare`
- 点击标题进入 `/posts/hello`；点击 `#Astro` 进入 `/tags/astro`
- 卡片是一个 `article`，标题链接是卡片内唯一的文章链接（标签链接各自独立，不嵌套在文章链接中）

**清理：** 无（只读夹具）

---

### TC-US04-03: 摘要来源与纯文本截取

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-03 |
| covers | SC-BROWSE-03 |
| Scenario | 摘要来源与纯文本截取 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | unit |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**测试数据：**

| 字段 | 值 |
|------|------|
| 有摘要 | `summary: '手写摘要'` |
| 无摘要 | `prev-post` 正文 |
| 极端 | 正文只有图片 / 代码块；正文含 `<script>`；正文 1 万字 |

**步骤：**
1. 调用 `excerptOf(post)`

**预期结果：**
- 有摘要 → 原样返回
- 无摘要 → 以"标题 粗体文字"开头，不含 `#`、`*`、`![`、`](`、`<`
- 长度 ≤ 120 字，截断处加"…"
- 只有图片 / 代码块 → 返回空字符串（卡片不显示摘要行）
- `<script>` 内容不出现

**清理：** 无（只读夹具）

---

### TC-US04-07: 非法页码 404

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-07 |
| covers | SC-BROWSE-06, SC-BROWSE-07 |
| Scenario | 非法页码 404 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**测试数据：**

| 字段 | 值 |
|------|------|
| 路径 | `/posts/page/1`、`/posts/page/4`、`/posts/page/0`、`/posts/page/abc` |

**步骤：**
1. 逐个访问

**预期结果：**
- 均返回 404 页

**清理：** 无（只读夹具）

---

### TC-US04-08: 空列表

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-08 |
| covers | SC-BROWSE-08 |
| Scenario | 空列表 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | build |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【数据前置】`reader-fixture-empty`

**步骤：**
1. 构建后读取 `/posts` 的 HTML

**预期结果：**
- 含"还没有文章"
- 无分页导航

**清理：** 无（只读夹具）

---

## UI 交互测试

### TC-US04-04: 摘要最多 3 行

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-04 |
| covers | SC-BROWSE-03 |
| Scenario | 摘要最多 3 行 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】390 视口

**步骤：**
1. 读取 Prev Post 卡片摘要元素的高度与行高

**预期结果：**
- 高度 ≤ 3 × 行高（`line-clamp: 3`）

**playwright_hint：**
```ts
const p = page.getByRole('article').filter({ hasText: 'Prev Post' }).locator('[data-excerpt]');
const { h, lh } = await p.evaluate(e => ({ h: e.clientHeight, lh: parseFloat(getComputedStyle(e).lineHeight) }));
expect(h).toBeLessThanOrEqual(lh * 3 + 1);
```

**清理：** 无（只读夹具）

---

### TC-US04-05: 封面显示与无封面布局

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-05 |
| covers | SC-BROWSE-04 |
| Scenario | 封面显示与无封面布局 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】1440 视口

**步骤：**
1. 读取 Hello Halcyon 与 Prev Post 卡片

**预期结果：**
- Hello 卡片有 `img`（`width="128" height="128"`、`object-fit: cover`、`loading="lazy"`、`alt=""`，src 为封面地址）
- Prev 卡片没有 `img`，文字区宽度 = 卡片内容宽度

**playwright_hint：**
```ts
await expect(card('Hello Halcyon').locator('img')).toHaveCSS('object-fit', 'cover');
await expect(card('Prev Post').locator('img')).toHaveCount(0);
```

**清理：** 无（只读夹具）

---

### TC-US04-06: 分页导航

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-06 |
| covers | SC-BROWSE-05 |
| Scenario | 分页导航 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/posts`；点页码 3；点"上一页"

**预期结果：**
- `/posts` 20 张卡片，分页为"上一页（不可用）1 2 3 下一页"，当前页 `aria-current="page"`
- 页码 3 → `/posts/page/3`，1 张卡片（First Post），"下一页"不可用
- "上一页" → `/posts/page/2`；第 2 页的"上一页"指向 `/posts`（不是 `/posts/page/1`）

**playwright_hint：**
```ts
const nav = page.getByRole('navigation', { name: '分页' });
await nav.getByRole('link', { name: '3' }).click();
await expect(page).toHaveURL('/posts/page/3');
```

**清理：** 无（只读夹具）

---

### TC-US04-09: 悬停错位、触屏与减弱动效

| 字段 | 值 |
|------|------|
| TC-ID | TC-US04-09 |
| covers | SC-BROWSE-09 |
| Scenario | 悬停错位、触屏与减弱动效 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 【环境前置】1440 视口

**步骤：**
1. 鼠标移入 Hello 卡片，等待 0.3s，读取两层虚线框的 transform
2. `reducedMotion: 'reduce'` 下重复
3. `hasTouch` 视口点按卡片前读取

**预期结果：**
- 移入后上层 `translate(-4px, -4px)`、下层 `translate(4px, 4px)`
- 减弱动效下 transform 为 none
- 触屏下虚线框不移动（悬停样式只在 `(hover: hover)` 下生效）

**playwright_hint：**
```ts
await card('Hello Halcyon').hover();
await expect(card('Hello Halcyon').locator('[data-layer="top"]')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -4, -4)');
```

**清理：** 无（只读夹具）

---

## 覆盖矩阵

| SC-ID | TC |
|-------|----|
| SC-BROWSE-01 | TC-US04-01 |
| SC-BROWSE-02 | TC-US04-02 |
| SC-BROWSE-03 | TC-US04-03, TC-US04-04 |
| SC-BROWSE-04 | TC-US04-05 |
| SC-BROWSE-05 | TC-US04-06 |
| SC-BROWSE-06 | TC-US04-07 |
| SC-BROWSE-07 | TC-US04-07 |
| SC-BROWSE-08 | TC-US04-08 |
| SC-BROWSE-09 | TC-US04-09 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
