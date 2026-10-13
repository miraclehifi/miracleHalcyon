# 后台文章列表 验收测试

**US ID**: US-07
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-management/US-07-post-list/behaviors.md)
**最后更新**: 2026-10-10
**Version Tag**: v1.0

> 验收规格（非可执行代码），由 behaviors.md 的 Given-When-Then 生成。
> 接口路径为占位，**接口路径以 design-domain API 契约为准**：
> - 列表：`GET /api/admin/posts?status=&q=&page=`
> - 页面：`/admin`（列表）、`/admin/posts/new`、`/admin/posts/:id`
>
> 状态标记文案按 design-ui 统一后的 `StatusBadge`：`草稿` / `已发布` / `已发布 · 有未发布修改`。列表行为卡片（`<li>` 内 `PostListItem`），只显示标题、状态、更新时间，不显示标签（admin-post-list.md"列表行"）。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US07-01 | SC-POSTLIST-01 | 列表按更新时间倒序，显示三种状态与行字段 | P0 | e2e |
| TC-US07-02 | SC-POSTLIST-01 | 列表接口返回全部状态文章与排序（等价类） | P0 | api |
| TC-US07-03 | SC-POSTLIST-04 | 状态筛选等价类（全部 / 草稿 / 已发布 / 非法值） | P1 | api |
| TC-US07-04 | SC-POSTLIST-05 | 标题关键字搜索不区分大小写 | P1 | api |
| TC-US07-05 | SC-POSTLIST-05, SC-POSTLIST-07 | 搜索特殊字符与注入（错误猜测） | P1 | security |
| TC-US07-06 | SC-POSTLIST-08 | 分页：45 篇 → 3 页，第 3 页 5 篇 | P0 | api |
| TC-US07-07 | SC-POSTLIST-08 | 分页边界值：20 / 21 / 40 / 41 篇 | P1 | api |
| TC-US07-08 | SC-POSTLIST-08 | 非法页码：超过末页 / 0 / -1 / abc | P1 | api |
| TC-US07-09 | SC-POSTLIST-04, SC-POSTLIST-05, SC-POSTLIST-08 | 筛选 + 搜索 + 分页组合（决策表） | P2 | api |
| TC-US07-10 | SC-POSTLIST-01 | 未登录访问列表页 / 列表接口被拒 | P0 | security |
| TC-US07-11 | SC-POSTLIST-01 | 列表接口性能（1000 篇） | P2 | performance |
| TC-US07-12 | SC-POSTLIST-01 | 状态标记渲染（含 dirty 判定） | P0 | ui-interaction |
| TC-US07-13 | SC-POSTLIST-02 | 点击标题进入写文章页 | P0 | ui-interaction |
| TC-US07-14 | SC-POSTLIST-03 | 点击"新建文章"进入空白写文章页 | P0 | ui-interaction |
| TC-US07-15 | SC-POSTLIST-04 | 选择"草稿"筛选，URL 同步并刷新保持 | P1 | ui-interaction |
| TC-US07-16 | SC-POSTLIST-05 | 搜索框输入后列表过滤 | P1 | ui-interaction |
| TC-US07-17 | SC-POSTLIST-06 | 空状态 | P1 | ui-interaction |
| TC-US07-18 | SC-POSTLIST-07 | 筛选无结果提示与"清除筛选" | P1 | ui-interaction |
| TC-US07-19 | SC-POSTLIST-08 | 分页控件交互 | P1 | ui-interaction |
| TC-US07-20 | SC-POSTLIST-09 | 加载失败显示错误并重试恢复 | P1 | ui-interaction |

---

## 功能 / 接口测试

### TC-US07-01: 列表按更新时间倒序，显示三种状态与行字段

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-01 |
| covers | SC-POSTLIST-01 |
| Scenario | BH-01 列表按更新时间倒序显示全部文章及状态 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 清空 post 表后创建 A / B / C（见测试数据）
- 【环境前置】已以测试管理员登录，持有有效会话 Cookie

**测试数据：**

| 文章 | 标题 | 状态 | 已发布内容 ≠ 编辑内容 | tags | updated_at |
|------|------|------|------|------|------|
| A | 草稿 A | draft | — | astro | 今天 10:00 |
| B | 已发布 B | published | 否 | react | 昨天 10:00 |
| C | 已发布 C | published | 是（dirty） | astro, cloudflare | 前天 10:00 |

**步骤：**
1. 访问 `/admin`
2. 读取列表行顺序、每行状态标记、标题、更新时间

**预期结果：**
- 列表依次显示 A、B、C
- 状态标记分别为"草稿"、"已发布"、"已发布 · 有未发布修改"
- 每行显示标题、状态、更新时间（不显示标签）

**清理：** Factory 清空 post 表

---

### TC-US07-02: 列表接口返回全部状态文章与排序（等价类）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-02 |
| covers | SC-POSTLIST-01 |
| Scenario | BH-01 接口层：草稿/已发布/已发布有修改三类等价类均被返回 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】同 TC-US07-01 的 A/B/C；另加 D（draft，updated_at 与 A 相同 10:00，id 更大）用于同时间排序稳定性
- 【环境前置】已登录会话

**测试数据：** `GET /api/admin/posts`（无参数）

**步骤：**
1. 调用列表接口
2. 再调用一次，比较两次顺序

**预期结果：**
- HTTP 200；返回 4 条，包含 draft 与 published（含 dirty）全部状态
- 按 updated_at 倒序；同 updated_at 时顺序稳定（两次调用一致，次级排序键以契约为准）
- 每条至少包含：id、title、slug、status、是否有未发布修改标识、tags、updated_at（字段名以 endpoint-details 为准，届时补 `schema_validation`）
- 不返回正文全文（列表无需正文，防止响应膨胀；以契约为准）

**清理：** 清空 post 表

---

### TC-US07-03: 状态筛选等价类

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-03 |
| covers | SC-POSTLIST-04 |
| Scenario | BH-04 按状态筛选 — 等价类划分 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 创建 2 篇 draft、3 篇 published（其中 1 篇 dirty）
- 【环境前置】已登录会话

**测试数据 / 预期结果：**

| 等价类 | status 参数 | 预期 |
|------|------|------|
| 有效-全部 | 省略 / `all` | 5 篇 |
| 有效-草稿 | `draft` | 2 篇，全为草稿 |
| 有效-已发布 | `published` | 3 篇（含 dirty 那篇） |
| 无效-未知值 | `foo` | 不返回 500；按"全部"处理或 400（以 API 契约为准，契约确定后固化） |
| 无效-大小写 | `DRAFT` | 同上，不返回 500 |

**步骤：** 依次以表中参数调用 `GET /api/admin/posts?status=...`

**清理：** 清空 post 表

---

### TC-US07-04: 标题关键字搜索不区分大小写

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-04 |
| covers | SC-POSTLIST-05 |
| Scenario | BH-05 按标题关键字搜索 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】标题：`Hello Astro`、`ASTRO 5 升级记录`、`React 入门`、`Cloudflare D1`；另一篇正文含 "astro" 但标题不含（`Workers 笔记`）
- 【环境前置】已登录会话

**测试数据 / 预期结果：**

| q | 预期 |
|------|------|
| `astro` | 只返回 `Hello Astro`、`ASTRO 5 升级记录` 这 2 篇（不区分大小写；不匹配正文） |
| `ASTRO` | 同上 2 篇 |
| `  astro  `（首尾空格） | 同上 2 篇（首尾空格被忽略） |
| 空字符串 | 返回全部 5 篇 |
| `升级` | 1 篇（中文子串匹配） |

**步骤：** 依次调用 `GET /api/admin/posts?q=...`

**清理：** 清空 post 表

---

### TC-US07-05: 搜索特殊字符与注入（错误猜测）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-05 |
| covers | SC-POSTLIST-05, SC-POSTLIST-07 |
| Scenario | 搜索输入含 LIKE 通配符、引号、SQL 注入载荷时按字面匹配 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】标题：`100% 纯手写`、`snake_case 命名`、`It's "quoted"`、`普通文章`
- 【环境前置】已登录会话

**测试数据 / 预期结果：**

| q | 预期 |
|------|------|
| `%` | 只返回 `100% 纯手写`（% 不作通配符） |
| `_` | 只返回 `snake_case 命名`（_ 不作通配符） |
| `'` | 只返回 `It's "quoted"`，HTTP 200 |
| `"quoted"` | 只返回 `It's "quoted"` |
| `' OR '1'='1` | 返回 0 条 → 前端显示"没有匹配的文章"；HTTP 200 |
| `'; DROP TABLE posts; --` | 返回 0 条；HTTP 200；之后 `GET /api/admin/posts` 仍返回 4 篇 |
| `<script>alert(1)</script>` | 返回 0 条；页面回显搜索词时作为文本显示，不执行脚本 |
| 1000 字符长串 | 不返回 500（返回 0 条或 400，以契约为准） |

**步骤：** 依次调用接口；最后一步对页面搜索框输入 `<script>` 载荷检查回显

**清理：** 清空 post 表

---

### TC-US07-06: 分页：45 篇 → 3 页，第 3 页 5 篇

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-06 |
| covers | SC-POSTLIST-08 |
| Scenario | BH-08 超过 20 篇分页 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 创建 45 篇（标题 `Post 01`…`Post 45`，updated_at 递增，`Post 45` 最新）
- 【环境前置】已登录会话

**步骤：**
1. `GET /api/admin/posts?page=1`
2. `GET /api/admin/posts?page=3`

**预期结果：**
- page=1：20 篇（`Post 45`…`Post 26`），总数 45、总页数 3
- page=3：5 篇（`Post 05`…`Post 01`）
- 各页之间无重复、无遗漏（三页 id 并集 = 45）

**清理：** 清空 post 表

---

### TC-US07-07: 分页边界值 20 / 21 / 40 / 41

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-07 |
| covers | SC-POSTLIST-08 |
| Scenario | BH-08 边界值分析 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】每行独立用 Factory 创建 N 篇（行间清空）
- 【环境前置】已登录会话

**测试数据 / 预期结果：**

| N | 总页数 | 末页条数 | 前端分页控件 |
|------|------|------|------|
| 0 | 0（或 1，以契约为准） | 0 | 不显示，显示空状态 |
| 1 | 1 | 1 | 不显示 |
| 20 | 1 | 20 | 不显示 |
| 21 | 2 | 1 | 显示 2 页 |
| 40 | 2 | 20 | 显示 2 页 |
| 41 | 3 | 1 | 显示 3 页 |

**步骤：** 每个 N 调用 `page=1` 与 `page=末页`

**清理：** 清空 post 表

---

### TC-US07-08: 非法页码

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-08 |
| covers | SC-POSTLIST-08 |
| Scenario | 页码超过末页 / 0 / 负数 / 非数字（错误猜测） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】45 篇文章
- 【环境前置】已登录会话

**测试数据 / 预期结果：**

| page | 预期 |
|------|------|
| `4`（超过末页） | HTTP 200，返回空列表 + 总页数 3；页面 `/admin?page=4` 显示"没有匹配的文章"或回到末页（以 design-ui 为准），不显示空状态"还没有文章" |
| `999999` | 同上 |
| `0` | 不返回 500；按第 1 页处理或 400（以契约为准） |
| `-1` | 同上 |
| `abc` | 同上 |
| `1.5` | 同上 |

**步骤：** 依次调用 `GET /api/admin/posts?page=...`，并访问对应 `/admin?page=...`

**清理：** 清空 post 表

---

### TC-US07-09: 筛选 + 搜索 + 分页组合（决策表）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-09 |
| covers | SC-POSTLIST-04, SC-POSTLIST-05, SC-POSTLIST-08 |
| Scenario | 多条件组合时结果为交集，分页基于过滤后结果 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】25 篇 draft 标题含 "Astro"、5 篇 published 标题含 "Astro"、10 篇 draft 标题不含
- 【环境前置】已登录会话

**决策表：**

| # | status | q | page | 预期条数 | 总页数 |
|------|------|------|------|------|------|
| R1 | 全部 | — | 1 | 20 | 2 |
| R2 | draft | — | 2 | 15 | 2 |
| R3 | draft | astro | 2 | 5 | 2 |
| R4 | published | astro | 1 | 5 | 1 |
| R5 | published | xyz | 1 | 0 | 0 |

**步骤：** 按决策表各行调用接口

**预期结果：** 条数与总页数与决策表一致；R3 结果均为 draft 且标题含 astro

**清理：** 清空 post 表

---

### TC-US07-10: 未登录访问列表被拒

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-10 |
| covers | SC-POSTLIST-01 |
| Scenario | 权限：列表含草稿，仅管理员可见 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】1 篇 draft
- 【环境前置】三种身份：无 Cookie / 伪造 Cookie `session=forged` / 已登出的旧 Cookie

**步骤：**
1. 各身份调用 `GET /api/admin/posts`
2. 各身份访问 `/admin`

**预期结果：**
- 接口返回 401，响应体不含任何文章标题
- 页面跳转 `/admin/login?next=/admin`

**清理：** 清空 post 表

---

### TC-US07-11: 列表接口性能

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-11 |
| covers | SC-POSTLIST-01 |
| Scenario | NFR：写作接口 P95 < 500ms；文章总量千篇以内 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（预发布环境） |
| type | performance |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Seed 1000 篇（各状态混合，每篇正文 ~10KB）
- 【环境前置】预发布环境（Cloudflare 真实 D1），已登录

**步骤：** 连续 100 次 `GET /api/admin/posts?page=1`、`?q=astro`、`?status=draft&page=50`

**预期结果：** 每类请求 P95 < 500ms

**清理：** 删除 Seed 数据

---

## UI 交互测试

> 以下 TC 均为 `type: ui-interaction`，运行于 Playwright（Chromium），选择器为建议写法，以实际 DOM/role 为准。

### TC-US07-12: 状态标记渲染

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-12 |
| covers | SC-POSTLIST-01 |
| Scenario | BH-01 行内状态标记与字段 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】同 TC-US07-01；【环境前置】已登录（storageState）

**步骤：** 访问 `/admin`

**预期结果：**
- 第 1/2/3 行标题为"草稿 A"/"已发布 B"/"已发布 C"
- 状态标记分别为"草稿"、"已发布"、"已发布 · 有未发布修改"
- 每行显示标题、状态、更新时间（不显示标签）

**playwright_hint：**
```ts
const rows = page.getByRole('listitem').filter({ has: page.getByRole('link') });
await expect(rows.nth(0)).toContainText('草稿 A');
await expect(rows.nth(0)).toContainText('草稿');
await expect(rows.nth(2)).toContainText('已发布 · 有未发布修改');
```

**清理：** 清空 post 表

---

### TC-US07-13: 点击标题进入写文章页

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-13 |
| covers | SC-POSTLIST-02 |
| Scenario | BH-02 点击文章进入写文章页 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】文章 A（记录 A.id）；【环境前置】已登录

**步骤：** 访问 `/admin`，点击 A 的标题

**预期结果：** 进入 `/admin/posts/{A.id}`

**playwright_hint：**
```ts
await page.getByRole('link', { name: '草稿 A' }).click();
await expect(page).toHaveURL(`/admin/posts/${a.id}`);
```

**清理：** 清空 post 表

---

### TC-US07-14: 点击"新建文章"

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-14 |
| covers | SC-POSTLIST-03 |
| Scenario | BH-03 点击"新建文章"进入空白写文章页 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】任意 1 篇文章；【环境前置】已登录

**步骤：** 在 `/admin` 点击"新建文章"

**预期结果：**
- 进入 `/admin/posts/new`
- 仅进入页面不新增文章（post 表数量不变，呼应 SC-AUTOSAVE-05）

**playwright_hint：**
```ts
await page.getByRole('button', { name: '新建文章' }).click();
await expect(page).toHaveURL('/admin/posts/new');
```

**清理：** 清空 post 表

---

### TC-US07-15: 状态筛选，URL 同步并刷新保持

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-15 |
| covers | SC-POSTLIST-04 |
| Scenario | BH-04 按状态筛选 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】2 篇草稿、3 篇已发布；【环境前置】已登录

**步骤：**
1. 访问 `/admin`，选择筛选"草稿"
2. 刷新页面
3. 选择筛选"全部"

**预期结果：**
- 列表只显示 2 篇草稿
- 地址栏带 `?status=draft`，刷新后筛选保持
- 选回"全部"后显示 5 篇，地址栏移除 `status` 参数（或 `status=all`）

**playwright_hint：**
```ts
await page.getByRole('tab', { name: '草稿' }).click(); // 或 combobox selectOption
await expect(page).toHaveURL(/status=draft/);
await page.reload();
await expect(page.getByRole('listitem').filter({ hasText: '草稿' })).toHaveCount(2);
```

**清理：** 清空 post 表

---

### TC-US07-16: 搜索框输入后列表过滤

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-16 |
| covers | SC-POSTLIST-05 |
| Scenario | BH-05 按标题关键字搜索 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】标题含 "Astro" 的 2 篇 + 不含的 3 篇；【环境前置】已登录

**步骤：** 在搜索框输入 `astro`（等待防抖结束）

**预期结果：**
- 列表只显示这 2 篇（不区分大小写）
- 连续快速输入不产生乱序结果（以最后一次输入为准）

**playwright_hint：**
```ts
await page.getByRole('searchbox').fill('astro');
await expect(page.getByRole('link', { name: /astro/i })).toHaveCount(2);
```

**清理：** 清空 post 表

---

### TC-US07-17: 空状态

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-17 |
| covers | SC-POSTLIST-06 |
| Scenario | BH-06 无文章时显示空状态 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】post 表为空；【环境前置】已登录

**步骤：** 访问 `/admin`；点击"写第一篇"

**预期结果：**
- 显示插画/图标、"还没有文章"和"写第一篇"按钮
- 不显示分页控件、不显示"没有匹配的文章"
- 点击"写第一篇"进入 `/admin/posts/new`

**playwright_hint：**
```ts
await expect(page.getByText('还没有文章')).toBeVisible();
await page.getByRole('link', { name: '写第一篇' }).click();
await expect(page).toHaveURL('/admin/posts/new');
```

**清理：** 无

---

### TC-US07-18: 筛选无结果提示与"清除筛选"

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-18 |
| covers | SC-POSTLIST-07 |
| Scenario | BH-07 筛选无结果时显示提示 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】3 篇文章，均不含 "xyz"；【环境前置】已登录

**步骤：**
1. 搜索 `xyz`
2. 点击"清除筛选"
3. 另测：仅选筛选"草稿"但无草稿时

**预期结果：**
- 显示"没有匹配的文章"与"清除筛选"按钮（区别于空状态"还没有文章"）
- 点击"清除筛选"后搜索框清空、筛选回到"全部"、显示 3 篇，URL 无查询参数
- 状态筛选无结果时同样显示"没有匹配的文章"

**playwright_hint：**
```ts
await page.getByRole('searchbox').fill('xyz');
await expect(page.getByText('没有匹配的文章')).toBeVisible();
await page.getByRole('button', { name: '清除筛选' }).click();
await expect(page.getByRole('searchbox')).toHaveValue('');
```

**清理：** 清空 post 表

---

### TC-US07-19: 分页控件交互

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-19 |
| covers | SC-POSTLIST-08 |
| Scenario | BH-08 超过 20 篇分页 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】45 篇；【环境前置】已登录

**步骤：**
1. 进入列表页
2. 点击第 3 页
3. 在第 3 页切换筛选"草稿"

**预期结果：**
- 第 1 页显示 20 篇，分页控件显示共 3 页
- 点击第 3 页后显示 5 篇，地址栏带 `page=3`，当前页按钮 `aria-current="page"`
- 第 1 页"上一页"禁用、第 3 页"下一页"禁用
- 改变筛选/搜索后页码重置为 1

**playwright_hint：**
```ts
await expect(page.getByRole('navigation', { name: /分页/ }).getByRole('link')).toContainText(['1','2','3']);
await page.getByRole('link', { name: '3', exact: true }).click();
await expect(page.getByRole('listitem')).toHaveCount(5);
await expect(page.getByRole('link', { name: '3', exact: true })).toHaveAttribute('aria-current', 'page');
```

**清理：** 清空 post 表

---

### TC-US07-20: 加载失败显示错误并重试

| 字段 | 值 |
|------|------|
| TC-ID | TC-US07-20 |
| covers | SC-POSTLIST-09 |
| Scenario | BH-09 加载失败显示错误与重试 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（路由拦截模拟 500） |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】3 篇文章；【环境前置】已登录；Playwright 拦截首屏之后的第一个列表请求返回 500（首屏数据由 SSR 读取，浏览器拦截不到）

**步骤：**
1. 进入列表页，切换到"草稿"筛选（触发列表请求，被拦截）
2. 取消拦截后点击"重试"

**预期结果：**
- 显示"加载失败"与"重试"按钮，不显示空状态
- 点击"重试"且接口恢复后列表正常显示（草稿筛选结果）
- 另测网络中断（`route.abort()`）表现相同

**playwright_hint：**
```ts
await page.goto('/admin');
await page.route('**/api/admin/posts*', r => r.fulfill({ status: 500 }), { times: 1 });
await page.getByRole('radio', { name: /草稿/ }).click();
await expect(page.getByText('加载失败')).toBeVisible();
await page.getByRole('button', { name: '重试' }).click();
await expect(page.getByRole('listitem')).not.toHaveCount(0);
```

**清理：** `page.unroute`；清空 post 表

---

## 测试数据策略

| 策略 | 用途 | 说明 |
|------|------|------|
| Factory `createPosts(n, { status, dirty, titlePattern, tags, updatedAtFrom, step })` | 所有 TC | 直接写测试 D1（绕过 UI），按需生成 N 篇，指定状态（draft / published）、是否 dirty（已发布内容 ≠ 编辑内容）、updated_at 起点与步长，保证排序确定 |
| Factory `resetPosts()` | 清理 | 每个 TC 前后清空 post 表（含已发布内容副本），保证独立 |
| Fixture `adminSession`（只读共享） | 认证 | 测试管理员凭据经 Secrets 注入测试环境；Playwright 用 storageState 复用；禁止使用生产账号 |
| Seed `perf-1000` | TC-US07-11 | 仅预发布环境，1000 篇混合状态，执行后删除 |

- 时间字段：updated_at 使用固定基准时间（如 2026-10-10T10:00:00+08:00）或冻结时钟，避免"今天/昨天"跨零点不稳定
- 时间显示格式以 `specs/engineering/shared-field-formats.md` 为准（尚未建立，design-domain 补充）

---

## 覆盖矩阵

| SC-ID | Behavior | 验收标准（story.md） | TC |
|-------|----------|------|------|
| SC-POSTLIST-01 | BH-01 | AC-1 | TC-US07-01, 02, 10, 11, 12 |
| SC-POSTLIST-02 | BH-02 | AC-2 | TC-US07-13 |
| SC-POSTLIST-03 | BH-03 | AC-3 | TC-US07-14 |
| SC-POSTLIST-04 | BH-04 | AC-4 | TC-US07-03, 09, 15 |
| SC-POSTLIST-05 | BH-05 | AC-4 | TC-US07-04, 05, 09, 16 |
| SC-POSTLIST-06 | BH-06 | AC-5 | TC-US07-17 |
| SC-POSTLIST-07 | BH-07 | AC-4 | TC-US07-05, 18 |
| SC-POSTLIST-08 | BH-08 | AC-6 | TC-US07-06, 07, 08, 09, 19 |
| SC-POSTLIST-09 | BH-09 | — | TC-US07-20 |

**NFR 覆盖**：授权（TC-US07-10）、写作接口 P95（TC-US07-11）、注入/XSS 边界（TC-US07-05）

**Gap 分析**：behaviors.md SC-ID 共 9 个（SC-POSTLIST-01 ~ 09），全部被 `covers` 引用。**Gap: 无**

---

## 执行记录

| 日期 | 执行人 | 结果 | 备注 |
|------|--------|------|------|
| — | — | ⏳ | 待 implement 阶段转为可执行测试 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | v1.0 | 初始创建 | miraclehifi |
| 2026-10-13 | v1.1 | 与 design-ui 对齐（build-post-list-page）：状态文案"已发布 · 有未发布修改"；行为卡片列表（`listitem`），不显示标签；编辑页路由 `/admin/posts/:id`；"新建文章"为按钮；TC-20 改为拦截首屏之后的列表请求（首屏 SSR） | miraclehifi |
