# 标签页 /tags/:tag 验收测试

**US ID**: US-05
**Story**: [story.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-05-tag-page/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-002-博客首页与阅读/stories/post-browsing/US-05-tag-page/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.0

> 验收规格（非可执行代码）。数据见 [_fixtures.md](../_fixtures.md) `reader-fixture`。标签地址规则（小写 + URL 编码）以 design-domain 为准。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US05-01 | SC-TAG-01 | 标签页内容与页头 | P0 | e2e |
| TC-US05-02 | SC-TAG-02 | 大小写合并与规范地址 | P0 | e2e |
| TC-US05-03 | SC-TAG-03 | 特殊字符标签 | P1 | e2e |
| TC-US05-04 | SC-TAG-04 | 标签页分页 | P1 | e2e |
| TC-US05-05 | SC-TAG-05 | 只在草稿中的标签 404 | P0 | e2e |
| TC-US05-06 | SC-TAG-02, SC-TAG-03 | 标签地址与显示名纯函数 | P1 | unit |

---

## 功能 / 接口测试

### TC-US05-01: 标签页内容与页头

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-01 |
| covers | SC-TAG-01 |
| Scenario | 标签页内容与页头 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/tags/cloudflare`

**预期结果：**
- 只有 Hello Halcyon、Filler 01，按日期倒序
- 页头"#Cloudflare"与"2 篇文章"
- `> cd ..` 指向 `/`；顶栏"文章"高亮

**清理：** 无（只读夹具）

---

### TC-US05-02: 大小写合并与规范地址

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-02 |
| covers | SC-TAG-02 |
| Scenario | 大小写合并与规范地址 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/tags/astro`；读取页头；在 `/posts` 中读取 Case Lower 与 Hello 的标签链接

**预期结果：**
- `/tags/astro` 包含 Case Lower（标签写作 `astro`），页头"#Astro"、"25 篇文章"
- 两张卡片的标签链接都是 `/tags/astro`
- `/tags/Astro` 不单独生成页面（返回 404；站内不会产生该链接）

**清理：** 无（只读夹具）

---

### TC-US05-03: 特殊字符标签

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-03 |
| covers | SC-TAG-03 |
| Scenario | 特殊字符标签 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 在 Latest Post 卡片点击 `#C# 与 .NET/Core`

**预期结果：**
- 地址为该标签小写后 `encodeURIComponent` 的结果（`/tags/c%23%20%E4%B8%8E%20.net%2Fcore`）
- 页面显示 Latest Post 与页头"#C# 与 .NET/Core"

**清理：** 无（只读夹具）

---

### TC-US05-04: 标签页分页

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-04 |
| covers | SC-TAG-04 |
| Scenario | 标签页分页 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/tags/astro`，点"下一页"

**预期结果：**
- 第 1 页 20 张；第 2 页地址 `/tags/astro/page/2`，5 张
- `/tags/astro/page/3` 为 404

**清理：** 无（只读夹具）

---

### TC-US05-05: 只在草稿中的标签 404

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-05 |
| covers | SC-TAG-05 |
| Scenario | 只在草稿中的标签 404 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-15 v1.0 初始创建 |

**前置条件：**
- 无

**步骤：**
1. 访问 `/tags/secret`

**预期结果：**
- 404 页

**清理：** 无（只读夹具）

---

### TC-US05-06: 标签地址与显示名纯函数

| 字段 | 值 |
|------|------|
| TC-ID | TC-US05-06 |
| covers | SC-TAG-02, SC-TAG-03 |
| Scenario | 标签地址与显示名纯函数 |
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
| 输入 | `['Astro','astro','Astro']`；`'C# 与 .NET/Core'`；`'  Astro '`；`'ASTRO'` |

**步骤：**
1. 调用 `tagSlug(name)` 与 `groupTags(posts)`

**预期结果：**
- `tagSlug` 统一小写后 `encodeURIComponent`，首尾空白已在 F-001 去除
- `groupTags` 合并大小写，显示名取出现次数最多的写法（相同时取最早发布文章中的写法），计数为文章数

**清理：** 无（只读夹具）

---

## 覆盖矩阵

| SC-ID | TC |
|-------|----|
| SC-TAG-01 | TC-US05-01 |
| SC-TAG-02 | TC-US05-02, TC-US05-06 |
| SC-TAG-03 | TC-US05-03, TC-US05-06 |
| SC-TAG-04 | TC-US05-04 |
| SC-TAG-05 | TC-US05-05 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-15 | 1.0 | 初始版本 | miraclehifi |
