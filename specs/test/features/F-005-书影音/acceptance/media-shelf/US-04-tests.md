# 按豆瓣用户批量导入标记 验收测试

**US ID**: US-04
**Story**: [story.md](../../../../../product/features/F-005-书影音/stories/media-shelf/US-04-douban-import/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-005-书影音/stories/media-shelf/US-04-douban-import/behaviors.md)
**最后更新**: 2026-10-23
**Version Tag**: v1.1

> 验收规格（非可执行代码）。占位接口，**接口路径、字段与错误码以 design-domain API 契约为准**：
> - 同步状态：`GET /api/admin/shelf/import/state[?uid=]` → `{uid, steps: [{kind, status, watermark, syncedAt}]}`（不带 `uid` 时取最近一次导入用的 ID）
> - 导入一页：`POST /api/admin/shelf/import`，请求 `{uid, kind: movie|book|game, status: done|doing, mode: full|incremental, start, head?}`
>   - 成功：`{total, head, nextStart, created, updated, coverFailed, failed: [{doubanId, title, reason}]}`；`nextStart` 为 `null` 表示该类别该状态已同步完（全量翻完或增量到达水位），此时服务端前移水位
>   - 失败：`error.code` ∈ `VALIDATION_FAILED` / `DOUBAN_USER_NOT_FOUND` / `DOUBAN_FORBIDDEN` / `FETCH_FAILED`（以 [api-contract](../../../../../engineering/backend/domains/shelf/api-contract.md) 为准，design-domain 已对齐）
> - 结束：`POST /api/admin/shelf/import/finish`，请求 `{changed}`；`changed > 0` 时触发一次 Deploy Hook
>
> **豆瓣数据来源打桩**：同 US-02，workers 测试替换 `fetch`，按 URL 返回 `tests/fixtures/douban/` 下的录制响应；本 US 新增 `interests-*` 夹具（2026-10-23 spike 录制自作者公开账号，裁剪为每份 ≤ 5 条）。E2E 中导入接口用 `page.route` 打桩。
> 未特别注明的 TC：Version Tag v1.0、Automation Feasibility ✅、Change History "2026-10-23 v1.0 初始创建"。TC-US04-18–23 为 v1.1（2026-10-23 增量同步）；TC-US04-14 于 v1.1 改为从服务端带出 ID。

## 测试数据

### 录制夹具（Fixture，只读）

| 名称 | 内容 | 用于 |
|------|------|------|
| `interests-movie-done` | 影视看过页：电影（type=movie，评 4 星，有短评）、剧集（type=tv）、未评分电影、`status: mark` 的混入条目、缺标题条目；`total: 45` | TC-01、04、05、08 |
| `interests-movie-done-p2` / `-p3` | 同一列表 start=20 / 40，第 1 页只有 19 条 | TC-08 |
| `interests-movie-doing` | 在看页：剧集 1 条，rating null | TC-01 |
| `interests-book-done` | 书：作者带国籍括号、`pubdate: ["2012-9-1"]`；漫画书 1 本 | TC-02 |
| `book-manga-tags` / `book-principles-tags` | 复用 US-02 夹具 | TC-02 |
| `interests-game-done` | 游戏：标记平台 PS5 / PC / NS 2 / 空；`genres` 含"桌游"的 1 款 | TC-03 |
| `game-video` | 复用 US-02，提供开发商 | TC-03 |
| `interests-movie-done-incr` | 影视看过第一页：3 条晚于水位 `2026-10-18 08:25:08`、2 条恰为水位（其一为本站已有、其一本站没有）、其余更早 | TC-18 |
| `interests-movie-done-doing2done` | 看过第一页最前为本站"进行中"剧集的看过标记 | TC-21 |
| `user-not-found` | 404 `{"msg":"traversal_error","code":404}` | TC-11 |
| `cover-ok.jpg` / 418 响应 | 封面下载成功 / 失败 | TC-06 |

### 已有条目（Factory，每个测试自建）

| 名称 | 内容 |
|------|------|
| `existing-hidden` | 豆瓣 ID 与夹具电影相同；状态进行中、评分空、`hidden: true`、有 R2 封面 |
| `state-synced` | `shelf_import_state`：uid `189806038` 6 行，`watermark` 各不相同、`synced_at` 2026-10-23T13:30:00Z |
| `existing-game` | 豆瓣 ID 与夹具游戏相同；开发商"Sucker Punch"、IGDB 封面、平台 ps4 |

**清理**：workers 测试按文件隔离 D1 / R2；E2E 导入接口打桩，不写真实数据。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US04-01 | SC-IMPORT-03, SC-IMPORT-07 | 影视映射：电影 / 剧集、状态、评分、日期、短评 | P0 | api |
| TC-US04-02 | SC-IMPORT-04 | 书映射：漫画、作者去国籍、年份 | P0 | api |
| TC-US04-03 | SC-IMPORT-05 | 游戏映射：平台（决策表）、桌游、开发商、不下载封面 | P0 | api |
| TC-US04-04 | SC-IMPORT-06 | 跳过想看（含接口混入） | P0 | api |
| TC-US04-05 | SC-IMPORT-13 | 单条失败不中断 | P0 | api |
| TC-US04-06 | SC-IMPORT-10 | 封面存 R2 与失败降级 | P0 | api |
| TC-US04-07 | SC-IMPORT-08, SC-IMPORT-09, SC-IMPORT-14 | 覆盖已有条目（状态转换），重复导入幂等 | P0 | api |
| TC-US04-08 | SC-IMPORT-11 | 分页边界 | P0 | api |
| TC-US04-09 | SC-IMPORT-16 | 只在结束时触发一次重建 | P0 | api |
| TC-US04-10 | SC-IMPORT-20 | 用户 ID 校验（等价类 / 边界） | P0 | security |
| TC-US04-11 | SC-IMPORT-17, SC-IMPORT-18, SC-IMPORT-19 | 豆瓣错误映射 | P0 | api |
| TC-US04-12 | SC-IMPORT-21 | 未登录 / 跨站调用 | P0 | security |
| TC-US04-13 | SC-IMPORT-19 | 单页请求时限与子请求数 | P1 | performance |
| TC-US04-14 | SC-IMPORT-01, SC-IMPORT-02 | 面板初始态与 ID 校验 | P1 | ui-interaction |
| TC-US04-15 | SC-IMPORT-12, SC-IMPORT-16 | 进度、汇总与列表刷新 | P0 | ui-interaction |
| TC-US04-16 | SC-IMPORT-15 | 停止导入 | P1 | ui-interaction |
| TC-US04-17 | SC-IMPORT-13, SC-IMPORT-17, SC-IMPORT-18, SC-IMPORT-19 | 失败列表与错误提示 | P1 | ui-interaction |
| TC-US04-18 | SC-IMPORT-22, SC-IMPORT-23 | 增量截断与同一秒边界 | P0 | api |
| TC-US04-19 | SC-IMPORT-24, SC-IMPORT-14 | 水位前移（状态转换） | P0 | api |
| TC-US04-20 | SC-IMPORT-25 | 无水位按全量 | P0 | api |
| TC-US04-21 | SC-IMPORT-26 | 在看改看过 | P1 | api |
| TC-US04-22 | SC-IMPORT-27, SC-IMPORT-01 | 同步状态接口与换 ID | P0 | api |
| TC-US04-23 | SC-IMPORT-01, SC-IMPORT-12, SC-IMPORT-22 | 面板增量模式：按钮、进度、汇总 | P0 | ui-interaction |

**覆盖目标**：需求覆盖 100%（AC1–AC12）、行为覆盖 100%（SC-IMPORT-01 – 27）。

---

## 功能 / 接口测试

### TC-US04-01: 影视映射

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-03, SC-IMPORT-07 | P0 | api |

**步骤：** 以 `{uid: "189806038", kind: "movie", status: "done", mode: "full", start: 0}` 调用导入；再以 `status: "doing"` 调用

**预期结果：**
- 200；`created` 等于夹具中有效条目数，`updated: 0`
- 电影条目：`type: movie`、`title`、`creator`（导演，多位以"、"连接，同 US-02）、`year`（整数）、`doubanUrl: https://movie.douban.com/subject/{id}/`、`doubanId`、`status: completed`、`rating: 4`、`markedAt: "YYYY-MM-DD"`（取 `create_time` 日期部分，北京时间原样）、`comment`（豆瓣短评原文；空字符串存为 `null`）
- 剧集条目：`type: series`；在看页条目 `status: in_progress`
- `rating: null` 的标记写入后 `rating` 为 `null`，不是 0

### TC-US04-02: 书映射

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-04 | P0 | api |

| 输入 | 期望 |
|------|------|
| `author: ["[哥伦比亚] 加西亚·马尔克斯"]` | `creator: "加西亚·马尔克斯"` |
| `pubdate: ["2012-9-1"]` | `year: 2012` |
| `pubdate: ["2024-1"]` | `year: 2024` |
| `pubdate: []` 或无该字段 | `year: null` |
| tags 接口含"漫画" | `type: comic` |
| tags 接口失败 | `type: book`（同 US-02） |

### TC-US04-03: 游戏映射（决策表）

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-05 | P0 | api |

| 标记 `platforms` | 新条目 `platform` |
|------------------|------------------|
| `[PS5]` | ps5 |
| `[PS4]` | ps4 |
| `[NS]` | switch |
| `[NS 2]` | switch2 |
| `[PC]` | steam |
| `[XSX]`（无法映射） | ps5 |
| `[XSX, PC]` | steam（取第一个能映射的） |
| `[]` | ps5 |

**预期结果（另）：**
- `genres` 含"桌游" → `type: boardgame`，`platform: null`
- `creator` 取自 `game/{id}` 的开发商；`year` 取 `release_date` 前 4 位
- 游戏条目 `coverKey`、`coverUrl` 均为 `null`；`fetch` 打桩记录中没有对游戏封面地址的请求

### TC-US04-04: 跳过想看

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-06 | P0 | api |

**测试数据：** 夹具页中混入 1 条 `status: "mark"`

**预期结果：** 该条未写入；不计入 `created` / `updated` / `failed`；向豆瓣请求时 `status` 参数只为 `done` / `doing`

### TC-US04-05: 单条失败不中断

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-13 | P0 | api |

**测试数据：** 夹具页含 1 条无标题条目

**预期结果：** 其余条目写入；`failed` 含 `{doubanId, title: null, reason: "PARSE_FAILED"}`；200

### TC-US04-06: 封面存 R2 与失败降级

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-10 | P0 | api |

| 封面响应 | 期望 |
|---------|------|
| 200 jpeg（`cover-ok.jpg`） | 条目 `coverKey` 以 `covers/` 开头，R2 中有对象 |
| 418 / 超时 / SVG / > 5 MB / 封面地址不在 `.doubanio.com` | 条目照常写入、`coverKey: null`，`coverFailed` 计 1 |

### TC-US04-07: 覆盖已有条目，重复导入幂等

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-08, SC-IMPORT-09, SC-IMPORT-14 | P0 | api |

**前置：** 建 `existing-hidden`、`existing-game`

**状态转换：** 条目 `doing / rating null` → 导入后 `done / rating 5`

**预期结果：**
- `existing-hidden`：状态、评分、日期、短评、标题、年份被覆盖；`hidden` 仍为 `true`；`coverKey` 不变；封面地址未被请求；`updated` 计 1
- `existing-game`：游戏详情打桩为失败、标记 `platforms: []` → `creator` 仍为"Sucker Punch"、`platform` 仍为 `ps4`、IGDB 封面与宽高不变
- 同一页连续调用两次：第二次 `created: 0`，`updated` = 有效条数；表中每个 `doubanId` 只有一行
- 不改动 `id`、`createdAt`；`updatedAt` 刷新

### TC-US04-08: 分页边界

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-11 | P0 | api |

| 请求 `start` | 夹具返回 | 期望 `nextStart` |
|-------------|---------|-----------------|
| 0 | total 45，19 条 | 20（按请求条数前进，不是 19） |
| 20 | 20 条 | 40 |
| 40 | 5 条 | `null` |
| 0 | total 0 | `null`，`created: 0` |

**预期结果（另）：** 向豆瓣请求的 `count` 固定为 20；`total` 原样返回

### TC-US04-09: 只在结束时触发一次重建

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-16 | P0 | api |

**预期结果：**
- 导入接口在任何情况下都不调用 Deploy Hook
- `finish {changed: 3}` → Deploy Hook 调用 1 次；`finish {changed: 0}` → 0 次

### TC-US04-10: 用户 ID 校验

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-20 | P0 | security |

| `uid` | 期望 |
|-------|------|
| `189806038`、`ahbei`、`a_b.c-d` | 通过 |
| 长度 64 | 通过 |
| 长度 65、空串 | 400 `VALIDATION_FAILED` |
| `../user/1`、`a/b`、`a?b`、`a#b`、`a%2Fb`、`张三`、含空格 | 400 `VALIDATION_FAILED` |
| `kind: "music"`、`status: "mark"`、`start: -1`、`start: 1.5`、`start: 10`（不是 20 的倍数）、`start: 100020`、`start: "x"`、`mode` 缺失或为 `"all"`、`head: "2026/10/18"` | 400 `VALIDATION_FAILED` |

**预期结果（另）：** 所有 400 情况下 `fetch` 打桩无调用记录；合法请求只访问 `https://m.douban.com/rexxar/api/v2/user/{uid}/interests`、`book/{id}/tags`、`game/{id}` 与 `*.doubanio.com` 封面，均为 `redirect: 'manual'`

### TC-US04-11: 豆瓣错误映射

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-17, SC-IMPORT-18, SC-IMPORT-19 | P0 | api |

| 标记列表响应 | 期望 |
|-------------|------|
| 404 | 404 `DOUBAN_USER_NOT_FOUND` |
| 403 / 返回体要求登录 | 403 `DOUBAN_FORBIDDEN` |
| 5xx / 超时 / 3xx / 非 JSON | 502 `FETCH_FAILED` |

**预期结果（另）：** 以上情况均未写入条目

### TC-US04-12: 未登录 / 跨站调用

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-21 | P0 | security |

**预期结果：** 无会话 → 401；`Origin` 非本站 → 403；两接口（导入、结束）一致；不写库、不触发重建

### TC-US04-13: 单页时限与子请求数

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-19 | P1 | performance |

**预期结果：** 单页 20 条（书，全部需 tags + 封面）时，外部请求数 ≤ 41；整页共享 25 秒 `AbortSignal`，超时按 `FETCH_FAILED` 返回且已写入的条目保留

### TC-US04-18: 增量截断与同一秒边界

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-22, SC-IMPORT-23 | P0 | api |

**前置：** 写入 `state-synced`（影视·看过水位 `2026-10-18 08:25:08`）；本站已有水位上那条已有标记对应的条目

**步骤：** `{mode: "incremental", kind: "movie", status: "done", start: 0}`，夹具 `interests-movie-done-incr`

| 标记时间 | 期望 |
|---------|------|
| 晚于水位 ×3 | 新增 |
| = 水位，本站已有 | 覆盖（计 updated） |
| = 水位，本站没有 | 新增（不漏同一秒） |
| 早于水位 | 不处理 |

**预期结果：** `created: 4`、`updated: 1`；`nextStart: null`；`head` 为第一条标记时间；`fetch` 打桩记录中只有 1 次列表请求；水位更新为 `head`，`syncedAt` 刷新

### TC-US04-19: 水位前移（状态转换）

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-24, SC-IMPORT-14 | P0 | api |

| 起始水位 | 本类请求序列 | 期望水位 / syncedAt |
|---------|-------------|--------------------|
| 无 | 全量 3 页，末页 `nextStart: null` | `head`（第 1 页第一条）/ 刷新 |
| 无 | 全量第 1 页成功、第 2 页 `FETCH_FAILED` | 无 / 不变 |
| T0 | 增量第 1 页到达水位 | `head` / 刷新 |
| T0 | 增量第 1 页成功（未到水位）、之后不再请求（停止） | T0 / 不变 |
| T0 | 全量翻完 | `head` / 刷新（全量也前移水位） |
| 无 | 豆瓣该类 total 0 | 无（`head: null`）/ 刷新 |

**预期结果（另）：** 第 2 页起请求带上第 1 页返回的 `head`；`head` 格式不是 `yyyy-MM-dd HH:mm:ss` → 400 `VALIDATION_FAILED`；`start > 0` 而未带 `head` → 400

### TC-US04-20: 无水位按全量

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-25 | P0 | api |

**前置：** 只有影视两行有水位

**步骤：** 书·读过 `{mode: "incremental", start: 0}`（total 45）

**预期结果：** 与 `mode: "full"` 结果一致：`nextStart: 20`，处理本页全部有效标记；翻到第 3 页 `nextStart: null` 后书·读过有了水位

### TC-US04-21: 在看改看过

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-26 | P1 | api |

**前置：** 本站剧集条目 `in_progress`；影视·看过有水位，且该标记时间晚于水位

**预期结果：** 增量同步后该条目 `status: completed`、`markedOn` 为新日期；`updated` 计 1；不新增条目

### TC-US04-22: 同步状态接口与换 ID

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-27, SC-IMPORT-01 | P0 | api |

| 场景 | 请求 | 期望 |
|------|------|------|
| 无任何记录 | `GET …/state` | `{uid: null, steps: 6 项 watermark / syncedAt 均为 null}` |
| `state-synced` | `GET …/state` | `uid: "189806038"`，6 项按 IMPORT_STEPS 顺序，`syncedAt` 为 ISO 8601 UTC |
| `state-synced`，随后以 `ahbei` 导入过一页 | `GET …/state` | `uid: "ahbei"`（最近一次导入用的 ID），6 项水位为空 |
| 同上 | `GET …/state?uid=189806038` | 原 6 项水位仍在 |
| `uid` 不合法 | `GET …/state?uid=a/b` | 400 `VALIDATION_FAILED` |
| 未登录 | `GET …/state` | 401 |

---

## UI 交互测试

### TC-US04-14: 面板初始态与 ID 校验

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-01, SC-IMPORT-02 | P1 | ui-interaction |

**步骤：** `page.route` 打桩状态接口返回 `{uid: "189806038", steps: [6 个都为 null]}` → 打开 `/admin/media` → 点"从豆瓣导入"；清空输入；输入 `abc/../x`

**预期结果：** 输入框带出 `189806038`；只有"全量导入"按钮；清空后按钮禁用；非法 ID 显示格式提示且按钮禁用

**Change History：** 2026-10-23 v1.0 初始创建；2026-10-23 v1.1 ID 改为由状态接口带出（原 localStorage）

**playwright_hint：** `await page.getByRole('button', { name: '从豆瓣导入' }).click(); await expect(page.getByLabel('豆瓣用户 ID')).toHaveValue('189806038'); await page.getByLabel('豆瓣用户 ID').fill('abc/../x'); await expect(page.getByRole('button', { name: '全量导入' })).toBeDisabled()`

### TC-US04-15: 进度、汇总与列表刷新

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-12, SC-IMPORT-16 | P0 | ui-interaction |

**步骤：** `page.route` 打桩导入接口：影视看过 2 页、其余类别各 1 页；记录 `finish` 调用

**预期结果：** 依次显示"影视 · 看过 20 / 40"等进度；进行中输入框与导入按钮禁用、显示"停止"；结束后显示"导入完成：新增 X、更新 Y、失败 0、封面失败 0"；`finish` 只被调用 1 次；列表重新加载

**playwright_hint：** `await expect(page.getByText(/影视 · 看过 \d+ \/ \d+/)).toBeVisible(); await expect(page.getByText(/导入完成：新增 \d+/)).toBeVisible(); expect(finishCalls).toBe(1)`

### TC-US04-16: 停止导入

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-15 | P1 | ui-interaction |

**步骤：** 打桩接口每页延迟响应；第 1 页进行中点"停止"

**预期结果：** 第 1 页响应后不再请求第 2 页；显示"已停止：新增 X……"；`finish` 被调用 1 次（`changed > 0`）

**playwright_hint：** `await page.getByRole('button', { name: '停止' }).click(); await expect(page.getByText(/已停止/)).toBeVisible(); expect(importCalls).toBe(1)`

### TC-US04-17: 失败列表与错误提示

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-13, SC-IMPORT-17, SC-IMPORT-18, SC-IMPORT-19 | P1 | ui-interaction |

| 接口打桩 | 期望面板 |
|---------|---------|
| 一页返回 `failed: [{doubanId: "1", title: null, reason: "PARSE_FAILED"}]` | 汇总下方失败列表显示"豆瓣 1：解析不出条目信息" |
| 404 `DOUBAN_USER_NOT_FOUND` | "豆瓣上找不到这个用户"，不调用 `finish` |
| 403 `DOUBAN_FORBIDDEN` | "豆瓣标记未公开或需要登录，无法导入" |
| 第 2 页 502 `FETCH_FAILED` | "豆瓣暂时无法访问，已导入的条目已保存，可稍后重新导入"；`finish` 调用 1 次 |

**playwright_hint：** `await expect(page.getByRole('alert')).toHaveText('豆瓣上找不到这个用户')`

### TC-US04-23: 面板增量模式：按钮、进度、汇总

| covers | Priority | type |
|--------|----------|------|
| SC-IMPORT-01, SC-IMPORT-12, SC-IMPORT-22 | P0 | ui-interaction |

**步骤：** 状态接口打桩为 6 类都有水位（`syncedAt` 2026-10-23T13:30:00Z）；导入接口打桩：每类第 1 页即 `nextStart: null`，影视·看过 `created: 3`；点"同步新标记"

**预期结果：** 打开面板显示"上次同步：2026-10-23 21:30"（按浏览器本地时区，测试固定 Asia/Shanghai）；主按钮"同步新标记"、次要"全量导入"；每个请求 `mode: "incremental"`、`start: 0`；进度显示"影视 · 看过 已同步 3 条"；结束显示"同步完成：新增 3、更新 0、失败 0、封面失败 0"；之后状态接口重新拉取，"上次同步"更新；`finish` 调用 1 次。点"全量导入"时请求 `mode: "full"`

**playwright_hint：** `await page.getByRole('button', { name: '同步新标记' }).click(); await expect(page.getByText('同步完成：新增 3')).toBeVisible(); expect(importBodies.every(b => b.mode === 'incremental')).toBe(true)`

---

## 追溯矩阵

| AC | Behaviors | TC |
|----|-----------|----|
| AC1 | BH-01 | TC-14 |
| AC2 | BH-02、06、12 | TC-04、10、14、15 |
| AC3 | BH-03、04、05、07 | TC-01、02、03 |
| AC4 | BH-10 | TC-06 |
| AC5 | BH-05 | TC-03 |
| AC6 | BH-08、09 | TC-07 |
| AC7 | BH-12、13、16 | TC-05、09、15、17 |
| AC8 | BH-11、14、19 | TC-07、08、11、13 |
| AC9 | BH-17、18、20 | TC-10、11、17 |
| AC10 | BH-15 | TC-16 |
| AC11 | BH-22、23、24、26 | TC-18、19、21、23 |
| AC12 | BH-25、27 | TC-20、22 |
| 安全 | BH-20、21 | TC-10、12 |
