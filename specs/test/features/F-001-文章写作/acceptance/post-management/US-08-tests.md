# 发布、更新与撤回文章 验收测试

**US ID**: US-08
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-management/US-08-publish-post/behaviors.md)
**最后更新**: 2026-10-13
**Version Tag**: v1.0

> 验收规格（非可执行代码）。占位接口，**接口路径以 design-domain API 契约为准**：
> - 发布 / 更新：`POST /api/admin/posts/:id/publish`（草稿发布与已发布更新是否共用，以契约为准；下文"发布更新"记为 `POST /api/admin/posts/:id/update`）
> - 撤回：`POST /api/admin/posts/:id/unpublish`
> - 保存：`PUT /api/admin/posts/:id`
> - 读者端读取路径（post Domain 已发布查询，F-002 页面接入前以接口验证）：`GET /api/posts`、`GET /api/posts/:slug`；读者页面 `/`、`/posts/:slug`
>
> 术语：**clean** = 已发布且编辑内容与已发布内容一致；**dirty** = 已发布且存在未发布修改。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US08-01 | SC-PUBLISH-01 | 发布草稿，读者可按 slug 读取 | P0 | e2e |
| TC-US08-02 | SC-PUBLISH-01 | 发布接口与读者端读取（接口层） | P0 | api |
| TC-US08-03 | SC-PUBLISH-02 | 发布日期等价类：空 → 今天；已填 → 保留 | P1 | api |
| TC-US08-04 | SC-PUBLISH-03 | 必填项缺失决策表 | P0 | api |
| TC-US08-05 | SC-PUBLISH-04 | 更新 dirty 文章，读者看到 V2 | P0 | e2e |
| TC-US08-06 | SC-PUBLISH-05 | 撤回为草稿，读者不可见，内容保留 | P0 | e2e |
| TC-US08-07 | SC-PUBLISH-06 | 读者端列表与详情永不暴露草稿/未发布修改 | P0 | security |
| TC-US08-08 | SC-PUBLISH-06 | 读者端绕过尝试（错误猜测） | P1 | security |
| TC-US08-09 | SC-PUBLISH-07 | 发布/更新/撤回后触发重建，5 分钟内可见 | P0 | performance |
| TC-US08-10 | SC-PUBLISH-09 | 发布前先保存未保存内容 | P0 | e2e |
| TC-US08-11 | SC-PUBLISH-10 | 发布失败状态不变并提示 | P1 | e2e |
| TC-US08-12 | SC-PUBLISH-10 | 更新/撤回失败状态不变（错误猜测） | P2 | api |
| TC-US08-13 | SC-PUBLISH-01, SC-PUBLISH-04, SC-PUBLISH-05 | 状态转换表（合法与非法转换） | P0 | api |
| TC-US08-14 | SC-PUBLISH-01, SC-PUBLISH-04, SC-PUBLISH-05 | 未登录发布/更新/撤回 → 401 | P0 | security |
| TC-US08-15 | SC-PUBLISH-01 | 跨站 Origin 调用发布 → 拒绝（CSRF） | P1 | security |
| TC-US08-16 | SC-PUBLISH-01, SC-PUBLISH-04 | 发布/更新接口性能 P95 < 500ms | P2 | performance |
| TC-US08-17 | SC-PUBLISH-08 | 按钮显隐/禁用矩阵 | P0 | ui-interaction |
| TC-US08-18 | SC-PUBLISH-08 | 请求进行中按钮加载并禁用，防重复提交 | P1 | ui-interaction |
| TC-US08-19 | SC-PUBLISH-03 | 必填缺失时提示并高亮输入框 | P1 | ui-interaction |
| TC-US08-20 | SC-PUBLISH-05 | 撤回确认框取消 / Esc 不改变状态 | P1 | ui-interaction |
| TC-US08-21 | SC-PUBLISH-01, SC-PUBLISH-04 | 成功提示与状态标记切换 | P1 | ui-interaction |

---

## 功能 / 接口测试

### TC-US08-01: 发布草稿，读者可按 slug 读取

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-01 |
| covers | SC-PUBLISH-01 |
| Scenario | BH-01 发布草稿后读者可读取 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 创建草稿：title `Hello Astro`、slug `hello-astro`、body `# Hi\n正文 V1`、published_at `2026-10-01`
- 【环境前置】已登录，打开 `/admin/posts/{id}/edit`，状态栏"已保存"

**步骤：**
1. 点击"发布"
2. 读者端 `GET /api/posts/hello-astro`

**预期结果：**
- 显示提示"已发布"
- 状态标记变为"已发布"
- 通过读者端接口可按 slug 读取到该文章（title、body 与发布时一致）

**清理：** `resetPosts()`

---

### TC-US08-02: 发布接口与读者端读取（接口层）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-02 |
| covers | SC-PUBLISH-01 |
| Scenario | BH-01 接口层验证 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】同 TC-US08-01；【环境前置】已登录会话

**步骤：**
1. 发布前 `GET /api/posts/hello-astro`
2. `POST /api/admin/posts/:id/publish`
3. `GET /api/posts/hello-astro`、`GET /api/posts`
4. `GET /api/admin/posts/:id`

**预期结果：**
- 步骤 1：返回不存在（404）
- 步骤 2：HTTP 200，返回 status=published、published_at、无未发布修改标识（字段以 endpoint-details 为准，届时补 `schema_validation`）
- 步骤 3：详情 200 且内容为 V1；列表包含该文章
- 步骤 4：status=published，clean

**清理：** `resetPosts()`

---

### TC-US08-03: 发布日期等价类

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-03 |
| covers | SC-PUBLISH-02 |
| Scenario | BH-02 发布日期为空时设为今天 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（冻结时钟） |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】三篇必填齐全的草稿，published_at 分别为空 / `2026-10-01` / `2027-01-01`
- 【环境前置】服务端时钟冻结为 2026-10-10T09:00:00+08:00；已登录

**测试数据 / 预期结果：**

| 等价类 | 发布前 published_at | 发布后 |
|------|------|------|
| 空 | null | 发布日期被设为今天（2026-10-10） |
| 过去日期 | 2026-10-01 | 保持 2026-10-01 |
| 未来日期 | 2027-01-01 | 保持（不做定时发布，读者可见；以 design-domain 确认） |

**边界补充**：时钟冻结在 2026-10-10T23:59:59+08:00 时，"今天"为 10-10（时区以 shared-field-formats 为准，默认作者时区 Asia/Shanghai）

**步骤：** 对每篇调用发布接口，读取 published_at

**清理：** `resetPosts()`；恢复时钟

---

### TC-US08-04: 必填项缺失决策表

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-04 |
| covers | SC-PUBLISH-03 |
| Scenario | BH-03 必填项缺失时不能发布 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】每行独立创建一篇草稿；【环境前置】已登录

**决策表：**

| # | 标题 | slug | 正文 | 预期 |
|------|------|------|------|------|
| R1 | `Hello` | `hello` | `正文` | 发布成功 |
| R2 | `无标题` | `hello` | `正文` | 拒绝，缺失：标题 |
| R3 | 空 | `hello` | `正文` | 拒绝，缺失：标题 |
| R4 | `Hello` | 空 | `正文` | 拒绝，缺失：slug |
| R5 | `Hello` | `hello` | 空 | 拒绝，缺失：正文 |
| R6 | `无标题` | 空 | 空 | 拒绝，缺失：标题、slug、正文 |
| R7 | `   `（空格） | `hello` | `正文` | 拒绝，缺失：标题（错误猜测：纯空白视为空） |
| R8 | `Hello` | `hello` | `\n\n  `（纯空白） | 拒绝，缺失：正文 |
| R9 | `Hello` | `Hello World!`（非法） | `正文` | 拒绝（slug 格式错误，见 SC-POSTINFO-07） |

**步骤：** 调用 `POST /api/admin/posts/:id/publish`

**预期结果：**
- 拒绝时 HTTP 4xx（400/422，以契约为准），响应列出缺失字段；UI 显示"发布前请填写：标题、slug、正文"中缺失的项
- 文章保持草稿状态；读者端按 slug 读取返回不存在

**清理：** `resetPosts()`

---

### TC-US08-05: 更新 dirty 文章

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-05 |
| covers | SC-PUBLISH-04 |
| Scenario | BH-04 更新已发布文章的修改 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】Factory 创建已发布文章 slug `v-post`，已发布内容 "V1"，编辑内容 "V2"（dirty）
- 【环境前置】已登录并打开写文章页

**步骤：**
1. 确认读者端 `GET /api/posts/v-post` 正文为 "V1"
2. 点击"发布更新"
3. 再次读取读者端；查看状态标记与"发布更新"按钮

**预期结果：**
- 读者读取到 "V2"
- 状态标记变为"已发布"（无修改标记）
- "发布更新"按钮变为禁用
- published_at 不变（更新不改发布日期，以 design-domain 确认）

**清理：** `resetPosts()`

---

### TC-US08-06: 撤回为草稿

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-06 |
| covers | SC-PUBLISH-05 |
| Scenario | BH-05 撤回已发布文章为草稿 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】已发布 dirty 文章 slug `to-draft`，已发布 "B1"，编辑 "B2"
- 【环境前置】已登录并打开写文章页

**步骤：**
1. 点击"更多 → 撤回为草稿"
2. 在确认框点击确认
3. 读者端 `GET /api/posts/to-draft`；刷新写文章页

**预期结果：**
- 弹出确认"撤回后读者将无法访问此文章"
- 状态变为"草稿"
- 读者端按 slug 读取返回不存在
- 编辑内容保留（编辑区为 "B2"，标题/slug/标签/摘要不变）

**清理：** `resetPosts()`

---

### TC-US08-07: 读者端永不暴露草稿或未发布修改

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-07 |
| covers | SC-PUBLISH-06 |
| Scenario | BH-06 读者永远读不到草稿或未发布修改 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿 A（slug `draft-a`，正文 "A1"，从未发布）；已发布 B（slug `post-b`，已发布 "B1"，编辑 "B2"，标题编辑为 "B 新标题"，已发布标题 "B 旧标题"）；曾发布后撤回的 C（slug `post-c`）
- 【环境前置】无会话 Cookie（读者身份）；另以管理员 Cookie 重复一遍

**步骤：**
1. `GET /api/posts`
2. `GET /api/posts/draft-a`、`/api/posts/post-b`、`/api/posts/post-c`
3. 访问读者页面 `/`、`/posts/post-b`（F-002 就绪后启用）

**预期结果：**
- 列表结果不含 A、C
- B 的内容为 "B1"，标题为 "B 旧标题"；响应任何字段（含摘要、标签、正文）都不出现 "B2"/"B 新标题"
- `draft-a`、`post-c` 返回不存在（404），响应体不泄露标题
- 携带管理员 Cookie 访问读者端结果完全相同（读者路径不因登录态切换数据源）

**清理：** `resetPosts()`

---

### TC-US08-08: 读者端绕过尝试（错误猜测）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-08 |
| covers | SC-PUBLISH-06 |
| Scenario | 通过参数、id、大小写等方式尝试读取草稿 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】同 TC-US08-07；【环境前置】无会话

**测试数据 / 预期结果：**

| 请求 | 预期 |
|------|------|
| `GET /api/posts?status=draft` | 只返回已发布文章（参数被忽略） |
| `GET /api/posts?preview=1` / `?draft=true` | 同上 |
| `GET /api/posts/post-b?version=latest` | 正文仍为 "B1" |
| `GET /api/posts/DRAFT-A` | 不存在 |
| `GET /api/posts/{A.id}`（用 id 代替 slug） | 不存在 |
| `GET /api/posts/draft-a%20` / `draft-a/` | 不存在 |
| `GET /api/admin/posts/{A.id}`（无会话） | 401 |

**清理：** `resetPosts()`

---

### TC-US08-09: 发布/更新/撤回后触发重建，5 分钟内可见

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-09 |
| covers | SC-PUBLISH-07 |
| Scenario | BH-07 发布/更新/撤回后触发读者页重建 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（预发布环境，需真实 Workers Builds 重建） |
| type | performance |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-12 v1.1 观察页面由首页 `/` 改为文章列表页 `/posts`（网站地图调整）；2026-10-13 v1.2 读者页改为构建时预渲染，时限 10 秒 → 重建完成（≤ 5 分钟） |

**前置条件：**
- 【数据前置】草稿 P1（slug `cache-p1`）；已发布 dirty P2（slug `cache-p2`，已发布 "V1"，编辑 "V2"）；已发布 clean P3（slug `cache-p3`）
- 【环境前置】预发布环境（已配置 Workers Builds Deploy Hook）；先以读者身份访问 `/posts`、`/posts/cache-p2`、`/posts/cache-p3`，确认为旧状态的静态页

**测试数据：**

| 子用例 | 操作 | 观察页面 | 期望最新状态 |
|------|------|------|------|
| a | 发布 P1 | `/posts`、`/posts/cache-p1` | 文章列表出现 P1；文章页 200 |
| b | 更新 P2 | `/posts`、`/posts/cache-p2` | 文章页正文 "V2"；文章列表标题/摘要为最新 |
| c | 撤回 P3 | `/posts`、`/posts/cache-p3` | 文章列表不含 P3；文章页 404 |

**步骤：** 执行操作并记录 T0（接口返回时刻）；确认 Workers Builds 出现一次 `build_trigger_source: "deploy_hook"` 的构建；之后每 10s 轮询观察页面（普通请求），记录首次看到最新状态的时刻 T1

**预期结果：**
- 每次操作触发一次重建
- 重建完成后读者访问文章列表页与该文章页看到最新状态（T1 − T0 ≤ 5 分钟，三个子用例均满足）
- 达到最新状态后不再回退到旧内容（继续轮询 1 分钟验证）

**清理：** `resetPosts()`；触发一次重建

---

### TC-US08-10: 发布前先保存未保存内容

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-10 |
| covers | SC-PUBLISH-09 |
| Scenario | BH-09 发布前先保存未保存内容 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（拦截保存请求延迟以稳定复现"未保存"） |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】必填齐全草稿 slug `save-first`，已保存正文 "S1"
- 【环境前置】已登录打开写文章页

**步骤：**
1. 将正文改为 "S2"，在 2 秒防抖到期前（状态栏为"未保存"）立即点击"发布"
2. 记录网络请求顺序
3. 读者端读取 `save-first`

**预期结果：**
- 先保存最新内容，再发布（保存请求完成后才发出发布请求）
- 读者看到的是点击发布时编辑区的内容（"S2"）
- 发布后状态"已发布"，无修改标记；不产生多余的额外保存导致 dirty
- 若前置保存失败 → 不发布，提示失败（同 TC-US08-11）

**清理：** `resetPosts()`

---

### TC-US08-11: 发布失败状态不变并提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-11 |
| covers | SC-PUBLISH-10 |
| Scenario | BH-10 发布请求失败时状态不变并提示 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（路由拦截） |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】必填齐全草稿，正文 "F1"
- 【环境前置】已登录；拦截发布接口返回 500（另测 `route.abort()` 网络失败）

**步骤：** 在编辑区追加 "F2" 后点击"发布"

**预期结果：**
- 显示"发布失败，请重试"
- 文章保持草稿状态，编辑内容不丢失（编辑区含 "F1F2"）
- "发布"按钮恢复可用；取消拦截后再次点击可发布成功
- 读者端仍返回不存在

**清理：** `unroute`；`resetPosts()`

---

### TC-US08-12: 更新/撤回失败状态不变（错误猜测）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-12 |
| covers | SC-PUBLISH-10 |
| Scenario | 更新与撤回请求失败时同样不改变状态 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（服务端故障注入或拦截） |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】已发布 dirty 文章（V1/V2）；【环境前置】故障注入使更新/撤回返回 500

**步骤 / 预期结果：**

| 操作 | 预期 |
|------|------|
| 更新失败 | 读者仍为 "V1"；状态仍为 dirty；UI 提示失败（文案以 design-ui 为准，参照"发布失败，请重试"） |
| 撤回失败 | 读者仍可读取 "V1"；状态仍为已发布 |
| 发布过程中 D1 写入部分失败（错误猜测） | 不出现"status=published 但读者端无内容"的中间态（操作原子性） |

**清理：** 关闭故障注入；`resetPosts()`

---

### TC-US08-13: 状态转换表

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-13 |
| covers | SC-PUBLISH-01, SC-PUBLISH-04, SC-PUBLISH-05 |
| Scenario | 文章状态机：draft ↔ published(clean) ↔ published(dirty)，任意 → deleted |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】每行以 Factory 构造起始状态的独立文章（必填齐全）；【环境前置】已登录

**状态图：**
```
draft ──publish──> published(clean) ──save(编辑)──> published(dirty)
  ^                  │   ^                              │
  └────unpublish─────┘   └────────────update───────────┘
published(dirty) ──unpublish──> draft（编辑内容保留为 dirty 内容）
任意状态 ──delete──> deleted（见 US-09）
```

**转换表：**

| # | 起始状态 | 事件 | 合法 | 目标状态 / 预期 |
|------|------|------|------|------|
| S1 | draft | publish | ✅ | published(clean)，读者可读 |
| S2 | draft | save | ✅ | draft（自动保存不改变发布状态） |
| S3 | draft | update | ❌ | 拒绝（409/400，以契约为准），状态不变 |
| S4 | draft | unpublish | ❌ | 拒绝，状态不变 |
| S5 | published(clean) | save（内容变化） | ✅ | published(dirty)，读者仍为旧内容 |
| S6 | published(clean) | save（内容不变） | ✅ | published(clean) |
| S7 | published(clean) | update | ❌ | 拒绝或幂等无变化（以契约为准；UI 按钮禁用） |
| S8 | published(clean) | publish | ❌ | 拒绝或幂等（不得重置 published_at） |
| S9 | published(clean) | unpublish | ✅ | draft，读者 404 |
| S10 | published(dirty) | update | ✅ | published(clean)，读者为新内容 |
| S11 | published(dirty) | unpublish | ✅ | draft，编辑内容为 dirty 内容，读者 404 |
| S12 | published(dirty) | publish | ❌/= | 拒绝或等同 update（以契约为准） |
| S13 | 任意 | delete | ✅ | deleted（US-09 验证） |
| S14 | deleted | publish / update / unpublish / save | ❌ | 404 |
| S15 | draft（必填缺失） | publish | ❌ | 拒绝（见 TC-US08-04） |
| S16 | draft（曾发布后撤回） | publish | ✅ | published(clean)，published_at 保持原值（以 design-domain 确认） |

**步骤：** 对每行构造起始状态 → 调用事件接口 → 查询管理端状态与读者端结果

**预期结果：** 每行目标状态与读者可见性与表中一致；非法转换不产生任何数据变化

**清理：** `resetPosts()`

---

### TC-US08-14: 未登录发布/更新/撤回 → 401

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-14 |
| covers | SC-PUBLISH-01, SC-PUBLISH-04, SC-PUBLISH-05 |
| Scenario | 权限：无会话 / 伪造会话 / 登出旧会话调用写接口 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】草稿 D、已发布 dirty P；【环境前置】三种身份：无 Cookie、`session=forged`、已登出旧 Cookie

**步骤：** 各身份调用：publish(D)、update(P)、unpublish(P)

**预期结果：**
- 全部返回 401
- D 仍为草稿，读者不可读；P 仍 dirty，读者仍为旧内容；缓存未被清除

**清理：** `resetPosts()`

---

### TC-US08-15: 跨站 Origin 调用发布（CSRF）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-15 |
| covers | SC-PUBLISH-01 |
| Scenario | NFR 写接口校验 Origin |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】草稿 D；【环境前置】有效管理员 Cookie

**步骤：** 携带有效 Cookie，分别以 `Origin: https://evil.example.com`、缺失 Origin、同源 Origin 调用 publish

**预期结果：** 跨站 → 403（以契约为准），D 仍为草稿；缺失 Origin 按契约处理；同源 → 成功

**清理：** `resetPosts()`

---

### TC-US08-16: 发布/更新接口性能

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-16 |
| covers | SC-PUBLISH-01, SC-PUBLISH-04 |
| Scenario | NFR 写作接口 P95 < 500ms |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（预发布环境） |
| type | performance |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】Factory 100 篇草稿（正文 ~10000 字）；【环境前置】预发布环境，已登录

**步骤：** 依次发布 100 篇，再各编辑一次后更新

**预期结果：** publish、update 接口 P95 < 500ms（不含缓存传播时间）

**清理：** `resetPosts()`

---

## UI 交互测试

> 以下 TC 均为 `type: ui-interaction`，Playwright 运行；选择器为建议写法。

### TC-US08-17: 按钮显隐/禁用矩阵

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-17 |
| covers | SC-PUBLISH-08 |
| Scenario | BH-08 按钮按状态显示与禁用 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】draft / published(clean) / published(dirty) 各一篇；【环境前置】已登录

**测试数据 / 预期结果：**

| 状态 | "发布" | "发布更新" | "撤回为草稿"（设置抽屉） |
|------|------|------|------|
| 草稿 | 显示（主按钮） | 不显示 | 不显示 |
| 已发布且无未发布修改 | 不显示 | 显示，禁用 | 显示 |
| 已发布且有未发布修改 | 不显示 | 显示，可用 | 显示 |
| clean 文章中编辑正文后（自动保存完成） | 不显示 | 由禁用变为可用 | 显示 |

**步骤：** 分别打开三篇文章写文章页；在 clean 文章中输入文字并等待"已保存"

**playwright_hint：**
```ts
await expect(page.getByRole('button', { name: '发布' })).toBeVisible();
await expect(page.getByRole('button', { name: '更新' })).toHaveCount(0);
// clean
await expect(page.getByRole('button', { name: '更新' })).toBeDisabled();
await page.getByRole('button', { name: '更多' }).click();
await expect(page.getByRole('menuitem', { name: '撤回为草稿' })).toBeVisible();
```

**清理：** `resetPosts()`

---

### TC-US08-18: 请求进行中加载并禁用

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-18 |
| covers | SC-PUBLISH-08 |
| Scenario | BH-08 发布/更新请求进行中按钮加载并禁用 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（路由延迟 2s） |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】草稿与 dirty 文章各一篇；【环境前置】已登录；拦截 publish/update 延迟 2s

**步骤：** 点击"发布"后在请求返回前连续再点击 3 次；对 dirty 文章的"发布更新"重复

**预期结果：**
- 对应按钮显示加载并禁用（`aria-busy="true"` 或 disabled）
- 服务端只收到 1 次发布 / 更新请求

**playwright_hint：**
```ts
await page.route('**/publish', async r => { await new Promise(f => setTimeout(f, 2000)); await r.continue(); });
const btn = page.getByRole('button', { name: '发布' });
await btn.click();
await expect(btn).toBeDisabled();
await btn.click({ force: true });
expect(publishRequestCount).toBe(1);
```

**清理：** `unroute`；`resetPosts()`

---

### TC-US08-19: 必填缺失时提示并高亮

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-19 |
| covers | SC-PUBLISH-03 |
| Scenario | BH-03 必填项缺失时不能发布（UI） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】草稿：标题"无标题"、slug 空、正文 "x"；【环境前置】已登录

**步骤：** 点击"发布"

**预期结果：**
- 显示"发布前请填写：标题、slug、正文"中缺失的项（本例为"标题、slug"）
- 标题与 slug 输入框高亮（`aria-invalid="true"`），焦点移至第一个缺失项
- 文章保持草稿状态

**playwright_hint：**
```ts
await page.getByRole('button', { name: '发布' }).click();
await expect(page.getByText(/发布前请填写：标题、slug/)).toBeVisible();
await expect(page.getByLabel('slug')).toHaveAttribute('aria-invalid', 'true');
await expect(page.getByLabel('标题')).toBeFocused();
```

**清理：** `resetPosts()`

---

### TC-US08-20: 撤回确认框取消 / Esc

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-20 |
| covers | SC-PUBLISH-05 |
| Scenario | BH-05 撤回确认框（取消分支） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】已发布文章；【环境前置】已登录

**步骤：**
1. "更多 → 撤回为草稿"，点击"取消"
2. 再次打开，按 Esc

**预期结果：**
- 弹出确认"撤回后读者将无法访问此文章"
- 取消 / Esc 后确认框关闭，状态仍为"已发布"，未发出撤回请求
- 关闭后焦点回到"更多"按钮

**playwright_hint：**
```ts
await page.getByRole('menuitem', { name: '撤回为草稿' }).click();
const dlg = page.getByRole('alertdialog');
await expect(dlg).toContainText('撤回后读者将无法访问此文章');
await page.keyboard.press('Escape');
await expect(dlg).toBeHidden();
await expect(page.getByRole('button', { name: '更多' })).toBeFocused();
```

**清理：** `resetPosts()`

---

### TC-US08-21: 成功提示与状态标记切换

| 字段 | 值 |
|------|------|
| TC-ID | TC-US08-21 |
| covers | SC-PUBLISH-01, SC-PUBLISH-04 |
| Scenario | BH-01 / BH-04 的 UI 反馈 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 【数据前置】必填齐全草稿；【环境前置】已登录

**步骤：** 点击"发布"；之后编辑正文等待保存；点击"发布更新"

**预期结果：**
- 发布后显示提示"已发布"（`role="status"` 可被读屏播报），状态标记变为"已发布"
- 编辑保存后标记变为有修改标记；点击"发布更新"后标记变为"已发布"（无修改标记）
- 返回 `/admin` 列表，该文章状态标记一致

**playwright_hint：**
```ts
await page.getByRole('button', { name: '发布' }).click();
await expect(page.getByRole('status')).toContainText('已发布');
await expect(page.getByTestId('post-status-badge')).toHaveText('已发布');
```

**清理：** `resetPosts()`

---

## 测试数据策略

| 策略 | 用途 | 说明 |
|------|------|------|
| Factory `createPost({ status: 'draft' \| 'published', publishedContent, draftContent, title, slug, publishedAt, updatedAt })` | 全部 TC | 直接写测试 D1，可同时指定"已发布内容"与"编辑内容"以构造 clean/dirty；createPosts(N, …) 批量 |
| Factory `resetPosts()` | 清理 | 清空 post 及其已发布副本；预发布环境同时触发读者页重建 |
| Fixture `adminSession`（只读共享） | 认证 | 测试管理员凭据经 Secrets 注入，Playwright storageState 复用；禁止生产账号 |
| Fixture `readerClient` | 读者端 | 无 Cookie 的 HTTP 客户端，用于读者可见性断言 |
| 冻结时钟 | TC-US08-03 | 服务端时间可注入（或测试环境变量），保证"今天"确定 |
| 故障注入 / 路由拦截 | TC-US08-11, 12, 18 | 前端用 `page.route`；接口层用测试环境故障开关 |

- 重建类 TC（TC-US08-09）只在预发布环境（真实 Workers Builds）执行；本地仅验证 `onPublicationChanged` 被调用

---

## 覆盖矩阵

| SC-ID | Behavior | 验收标准（story.md） | TC |
|-------|----------|------|------|
| SC-PUBLISH-01 | BH-01 | AC-1 | TC-US08-01, 02, 13, 14, 15, 16, 21 |
| SC-PUBLISH-02 | BH-02 | AC-1 | TC-US08-03 |
| SC-PUBLISH-03 | BH-03 | AC-2 | TC-US08-04, 19 |
| SC-PUBLISH-04 | BH-04 | AC-3 | TC-US08-05, 13, 14, 16, 21 |
| SC-PUBLISH-05 | BH-05 | AC-4 | TC-US08-06, 13, 14, 20 |
| SC-PUBLISH-06 | BH-06 | 约束 | TC-US08-07, 08 |
| SC-PUBLISH-07 | BH-07 | AC-5 | TC-US08-09 |
| SC-PUBLISH-08 | BH-08 | AC-6 | TC-US08-17, 18 |
| SC-PUBLISH-09 | BH-09 | AC-1 | TC-US08-10 |
| SC-PUBLISH-10 | BH-10 | — | TC-US08-11, 12 |

**NFR 覆盖**：授权 401（TC-US08-14）、CSRF（TC-US08-15）、写接口 P95（TC-US08-16）、读者页重建（TC-US08-09）

**Gap 分析**：behaviors.md SC-ID 共 10 个（SC-PUBLISH-01 ~ 10），全部被 `covers` 引用。**Gap: 无**

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
| 2026-10-10 | v1.1 | 按钮名"更新"改为"发布更新"；撤回入口为设置抽屉（design-ui 界面审阅） | miraclehifi |
| 2026-10-13 | v1.2 | TC-US08-09 改为验证重建触发与 5 分钟内可见（读者页构建时预渲染） | miraclehifi |
