# 后台管理书影音条目 验收测试

**US ID**: US-01
**Story**: [story.md](../../../../../product/features/F-005-书影音/stories/media-shelf/US-01-manage-entries/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-005-书影音/stories/media-shelf/US-01-manage-entries/behaviors.md)
**最后更新**: 2026-10-22
**Version Tag**: v1.0

> 验收规格（非可执行代码）。占位接口，**接口路径与字段以 design-domain API 契约为准**：
> - 页面：`/admin/media`（`?type=` 选分类）
> - 条目：`GET/POST /api/admin/shelf/entries`、`PUT/DELETE /api/admin/shelf/entries/:id`、`POST /api/admin/shelf/entries/:id/hide|unhide`
> - 封面上传：随保存请求或独立接口，由 design-arch 定
>
> 字段格式按 [shared-field-formats](../../../../../engineering/shared-field-formats.md)（书影音分类 / 状态 / 评分 / 年份 / 日期）。
> 未特别注明的 TC：Version Tag v1.0、Automation Feasibility ✅、Change History "2026-10-21 v1.0 初始创建"。

## 测试数据（共享 Factory）

| 名称 | 构造方式 | 说明 |
|------|---------|------|
| `entry({type, title, status, markedOn, rating?, creator?, year?, comment?, cover?, doubanId?, hidden?, platform?, coverUrl?, coverWidth?, coverHeight?})` | 直接写 D1 条目表；`cover: true` 时同时在测试 bucket 写一个封面对象 | 默认 `type: book`、`status: completed`、`markedOn: 2026-10-01`；`type: game` 时默认 `platform: ps5` |
| `igdbStub` | workers 测试替换 `fetch`：`images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg` → 810×1080 jpg 头；`…/co5vmg.jpg` → 811×1080；`…/cosvg01.jpg` → svg 文本；`…/nope000.jpg` → 404；`…/coslow1.jpg` → 挂起；`…/co3xx01.jpg` → 302 到 `https://evil.example/`；其他主机一律记录并 500 | 记录全部请求主机，断言只访问 `images.igdb.com` |
| `coverFile(kind, bytes)` | 内存构造文件：`jpg` / `png` / `webp` 带正确文件头，`svg` 为文本，`fakeJpg` 为扩展名 jpg 但内容为文本 | 封面上传用 |
| `deployHookStub` | E2E 中打桩 Deploy Hook 地址并计数（见 Auto Memory"E2E 共享存储"：会触发外部调用的接口打桩）；workers 测试中替换 fetch | 断言重建是否触发 |

**清理**：workers 测试按文件隔离存储；E2E 用例创建的条目标题带唯一前缀 `e2e-{随机}`，用例结束按前缀删除（本地 D1 跨运行共享）。

---

## 测试用例列表

| TC ID | covers | 场景 | Priority | type |
|-------|--------|------|----------|------|
| TC-US01-01 | SC-MANAGE-01 | 顶栏进入列表，分类切换与隐藏标记 | P0 | e2e |
| TC-US01-02 | SC-MANAGE-02 | 列表排序（进行中置顶 + 日期倒序 + 同日稳定） | P0 | api |
| TC-US01-03 | SC-MANAGE-05, SC-MANAGE-06 | 新增条目：必填最小集与全字段往返 | P0 | api |
| TC-US01-04 | SC-MANAGE-07, SC-MANAGE-08 | 字段校验：等价类与边界值 | P0 | api |
| TC-US01-05 | SC-MANAGE-10, SC-MANAGE-11 | 封面上传：格式、文件头、大小边界 | P0 | api |
| TC-US01-06 | SC-MANAGE-12 | 编辑：在读 → 读过 | P0 | api |
| TC-US01-07 | SC-MANAGE-13 | 换封面 / 移除封面清理旧对象 | P0 | api |
| TC-US01-08 | SC-MANAGE-14 | 隐藏状态转换 | P0 | api |
| TC-US01-09 | SC-MANAGE-15 | 删除条目连同封面 | P0 | api |
| TC-US01-10 | SC-MANAGE-05, SC-MANAGE-12, SC-MANAGE-14, SC-MANAGE-15 | 写操作触发重建（决策表） | P0 | api |
| TC-US01-11 | SC-MANAGE-19 | Deploy Hook 失败不影响保存 | P1 | api |
| TC-US01-12 | SC-MANAGE-20 | 清除豆瓣链接 | P1 | api |
| TC-US01-13 | SC-MANAGE-22 | 未登录 / 跨站调用写接口 | P0 | security |
| TC-US01-14 | SC-MANAGE-21 | 未登录访问后台页跳转登录 | P0 | e2e |
| TC-US01-15 | SC-MANAGE-06 | 错误猜测：特殊字符、超长、XSS 文本 | P1 | api |
| TC-US01-16 | SC-MANAGE-05, SC-MANAGE-06 | E2E 主流程：新增 → 列表可见 | P0 | e2e |
| TC-US01-17 | SC-MANAGE-03 | 空状态 | P1 | ui-interaction |
| TC-US01-18 | SC-MANAGE-04 | 新增表单默认值 | P1 | ui-interaction |
| TC-US01-19 | SC-MANAGE-07 | 前端必填校验不发请求 | P1 | ui-interaction |
| TC-US01-20 | SC-MANAGE-09 | 状态动词随分类切换 | P1 | ui-interaction |
| TC-US01-21 | SC-MANAGE-10, SC-MANAGE-11 | 封面预览与拒绝提示 | P1 | ui-interaction |
| TC-US01-22 | SC-MANAGE-14 | 隐藏按钮切换文案与标记 | P1 | ui-interaction |
| TC-US01-23 | SC-MANAGE-15, SC-MANAGE-16 | 删除确认框：确认 / 取消 / Esc | P0 | ui-interaction |
| TC-US01-24 | SC-MANAGE-17 | 保存中加载态与防重复提交 | P1 | ui-interaction |
| TC-US01-25 | SC-MANAGE-18 | 保存失败提示并保留内容 | P1 | ui-interaction |
| TC-US01-26 | SC-MANAGE-23 | 游戏条目：平台与 IGDB 封面链接规范化、读取宽高 | P0 | api |
| TC-US01-27 | SC-MANAGE-24 | IGDB 链接校验与防 SSRF（等价类 + 错误猜测） | P0 | security |
| TC-US01-28 | SC-MANAGE-25 | 切换分类时平台与封面的处理（状态转换） | P1 | api |
| TC-US01-29 | SC-MANAGE-23, SC-MANAGE-24, SC-MANAGE-25 | 表单：平台下拉、封面链接输入、预览比例与错误提示 | P1 | ui-interaction |

**覆盖目标**：需求覆盖 100%（AC1–AC11）、行为覆盖 100%（SC-MANAGE-01 – 25）。

---

## 功能 / 接口测试

### TC-US01-01: 顶栏进入列表，分类切换与隐藏标记

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-01 | P0 | e2e |

**前置条件：** 【数据】`entry` ×3（book，其一 `hidden: true`）、×1（movie）；【环境】已登录，位于 `/admin`

**步骤：** 1. 点顶栏"书影音"　2. 点"电影"标签　3. 直接访问 `/admin/media?type=anime`

**预期结果：**
- 步骤 1：URL 为 `/admin/media`；顶栏"书影音"为当前项；"书"标签 `aria-selected="true"`；3 行，每行有封面（或占位）、标题、作者、状态动词"读过"、评分、`2026-10-01`；隐藏那行带"已隐藏"
- 步骤 2：只显示 1 行电影；URL 带 `type=movie`；分类导航依次为 书 / 漫画 / 电影 / 剧集 / 游戏 / 桌游
- 步骤 3：已去掉的分类按非法参数处理，"书"为当前分类（[drop-anime-type](../../../../../backlog/drop-anime-type.md)）

### TC-US01-02: 列表排序

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-02 | P0 | api |

**测试数据：**

| 条目 | status | markedOn | 创建顺序 |
|------|--------|----------|---------|
| A | completed | 2026-03-01 | 1 |
| B | in_progress | 2026-01-10 | 2 |
| C | completed | 2026-09-15 | 3 |
| D | in_progress | 2026-08-01 | 4 |
| E | completed | 2026-09-15 | 5 |

**步骤：** `GET /api/admin/shelf/entries?type=book`

**预期结果：** 顺序为 D、B、E、C、A（进行中在前，组内标记日期倒序；同日按创建时间倒序，结果确定）

### TC-US01-03: 新增条目：必填最小集与全字段往返

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-05, SC-MANAGE-06 | P0 | api |

**测试数据：**

| 组 | 请求体 |
|----|--------|
| 最小 | `{type: "book", title: "原则", status: "completed", markedOn: "2026-10-01"}` |
| 全字段 | `{type: "game", title: "塞尔达传说", creator: "任天堂", year: 2023, status: "completed", rating: 5, markedOn: "2026-05-01", comment: "神作"}` + 封面 `coverFile(jpg, 300 KB)` |

**步骤：** 分别 `POST` 新增；再 `GET` 该条目

**预期结果：**
- 201；返回 `id`（字符串整数）
- 最小组：`creator`、`year`、`rating`、`comment`、`cover`、`doubanUrl`、`doubanId` 均为 `null`；`hidden: false`
- 全字段组：读回各字段与请求一致；`cover` 为站内 R2 路径，R2 中对象存在
- 响应含 `createdAt`、`updatedAt`（ISO 8601）

### TC-US01-04: 字段校验：等价类与边界值

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-07, SC-MANAGE-08 | P0 | api |

**测试数据（在"最小"请求体上逐项替换，期望结果）：**

| 字段 | 值 | 期望 |
|------|-----|------|
| title | `""`、`"   "`、缺失 | 400 `VALIDATION_FAILED`，`field: title` |
| title | `"a"`（1 字符）、200 字符 | 201 |
| title | 201 字符 | 400 |
| type | `"music"`、`"BOOK"`、`"anime"`（已去掉的分类） | 400 |
| status | `"wish"` | 400 |
| rating | `0`、`6`、`3.5`、`"4"` | 400 |
| rating | `1`、`5`、`null` | 201 |
| year | `23`、`20231`、`"2023"` | 400 |
| year | `1000`、`9999`、`null` | 201 |
| markedOn | `"2026-13-01"`、`"2026/10/01"`、缺失 | 400 |
| markedOn | `"2026-02-29"` | 400（非闰年） |
| comment | 1,000 字符 | 201 |
| comment | 1,001 字符 | 400 |

**预期结果：** 400 时 D1 无新增记录。长度上限（标题 200、短评 1,000、作者 200）若 design-domain 另定，以契约为准并同步本表。

### TC-US01-05: 封面上传：格式、文件头、大小边界

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-10, SC-MANAGE-11 | P0 | api |

**测试数据与期望：**

| 文件 | 期望 |
|------|------|
| `coverFile(jpg, 300 KB)`、`png`、`webp` | 成功，R2 有对象，Content-Type 与文件头一致 |
| `coverFile(jpg, 5 MiB)` | 成功（上限含等号） |
| `coverFile(jpg, 5 MiB + 1 B)` | 400 `COVER_TOO_LARGE` |
| `coverFile(svg)`、`coverFile(fakeJpg)`、gif | 400 `COVER_TYPE_INVALID` |

**预期结果：** 失败时条目不保存（新增）或封面保持原值（编辑），R2 无新对象残留

### TC-US01-06: 编辑：在读 → 读过

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-12 | P0 | api |

**前置：** `entry({title: "三体", status: "in_progress", markedOn: "2026-08-01"})`、`entry({status: "completed", markedOn: "2026-10-01"})`

**步骤：** `PUT` 三体 `{status: "completed", rating: 4, comment: "好看", markedOn: "2026-10-20"}`（其余字段原样），再取列表

**预期结果：** 200；读回值一致；`updatedAt` 晚于 `createdAt`；列表中三体排第一（2026-10-20 最新的已完成）且不在进行中组

### TC-US01-07: 换封面 / 移除封面清理旧对象

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-13 | P0 | api |

**步骤：** 1. 带封面新增 X，记下对象 key `old`　2. 编辑 X 上传新封面　3. 编辑 X 移除封面（`cover: null`）　4. 编辑 X 不改封面（其他字段改动）

**预期结果：**
- 步骤 2：`cover` 指向新 key `new`；R2 中 `old` 不存在、`new` 存在
- 步骤 3：`cover` 为 `null`；`new` 不存在
- 步骤 4（另起数据：带封面的 Y）：封面 key 与对象均不变

### TC-US01-08: 隐藏状态转换

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-14 | P0 | api |

**状态转换：**

| 起始 | 操作 | 结果 |
|------|------|------|
| 显示 | hide | 隐藏，200 |
| 隐藏 | unhide | 显示，200 |
| 隐藏 | hide | 隐藏，200（幂等） |
| 显示 | unhide | 显示，200（幂等） |
| 不存在的 id | hide | 404 |

**预期结果：** 后台列表接口始终返回隐藏条目并带 `hidden: true`；读者端数据源（US-03）不含隐藏条目

### TC-US01-09: 删除条目连同封面

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-15 | P0 | api |

**步骤：** 1. 删除带封面的 X　2. 删除无封面的 Y　3. 再次删除 X　4. 删除 id `"abc"`

**预期结果：** 1–2：204，记录不存在，X 的 R2 对象已删除；3：404；4：404 或 400

### TC-US01-10: 写操作触发重建（决策表）

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-05, SC-MANAGE-12, SC-MANAGE-14, SC-MANAGE-15 | P0 | api |

| 操作 | 结果 | 触发 Deploy Hook |
|------|------|-----------------|
| 新增成功 | 201 | 1 次 |
| 编辑成功 | 200 | 1 次 |
| 隐藏 / 取消隐藏（状态有变化） | 200 | 1 次 |
| 隐藏已隐藏的条目（无变化） | 200 | 0 次 |
| 删除成功 | 204 | 1 次 |
| 校验失败（400）/ 未登录（401）/ 不存在（404） | — | 0 次 |

**预期结果：** `deployHookStub` 计数与表一致

### TC-US01-11: Deploy Hook 失败不影响保存

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-19 | P1 | api |

**前置：** Deploy Hook 桩返回 500 / 抛网络错误

**预期结果：** 新增返回 201，记录存在；处理方式与文章发布的 Deploy Hook 失败一致（不回滚、记录日志）

### TC-US01-12: 清除豆瓣链接

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-20 | P1 | api |

**前置：** `entry({doubanId: "1292052"})`（`doubanUrl` 同步）

**步骤：** `PUT` `{..., doubanUrl: null}`

**预期结果：** `doubanUrl`、`doubanId` 均为 `null`；之后识别 1292052 不再提示重复（见 US-02 TC）

### TC-US01-13: 未登录 / 跨站调用写接口

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-22 | P0 | security |

**矩阵：** 接口 ∈ {新增, 编辑, 隐藏, 取消隐藏, 删除, 封面上传, 列表} × 身份 ∈ {无 Cookie, 过期会话, 有效会话 + 异站 Origin, 有效会话 + 本站 Origin}

**预期结果：** 无 Cookie / 过期会话 → 401；异站 Origin（写接口）→ 403；仅最后一列成功；被拒请求不改数据、不触发 Deploy Hook、R2 无新对象

### TC-US01-14: 未登录访问后台页跳转登录

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-21 | P0 | e2e |

**步骤：** 清空 Cookie，访问 `/admin/media?type=movie`

**预期结果：** 跳转登录页（与其他后台页一致，含回跳参数时登录后回到原地址）

### TC-US01-15: 错误猜测：特殊字符、超长、XSS 文本

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-06 | P1 | api |

**测试数据：** 标题 `<script>alert(1)</script>`、短评 `<img src=x onerror=alert(1)>`、作者 `O'Brien & "Sons"`、标题含 emoji `🎮 Zelda`、短评含换行

**预期结果：** 原样存储与读回；后台列表与读者页（US-03）以文本显示，不执行脚本；短评换行在读者页保留为换行

### TC-US01-16: E2E 主流程：新增 → 列表可见

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-05, SC-MANAGE-06 | P0 | e2e |

**步骤：** 在 `/admin/media?type=book` 点"新增条目"，填标题 `e2e-xxx 原则`、作者、评分 4、上传 jpg 封面，点"保存"

**预期结果：** 提示"已保存"；回到书列表，首个已完成条目（标记日期今天）为该条目，封面缩略图来自站内地址；`deployHookStub` 计数 +1

### TC-US01-26: 游戏条目：平台与 IGDB 封面链接规范化、读取宽高

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-23 | P0 | api |

**前置条件：** `igdbStub`

| # | 请求 `fields` | 期望 |
|---|--------------|------|
| 1 | `type: game`、`platform: ps5`、`coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co8h3y.webp"` | 201；`coverUrl` = `https://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg`、`coverWidth: 810`、`coverHeight: 1080`、`cover: null`；触发一次 Deploy Hook |
| 2 | 同 1，`coverUrl` 用 `t_720p/co5vmg.png` | `t_1080p/co5vmg.jpg`、811×1080 |
| 3 | 同 1，`coverUrl: null` | 201；无封面，`coverWidth` / `coverHeight` 为 `null` |
| 4 | `type: game`，不传 `platform` | 400 `VALIDATION_FAILED`，`fields: ["platform"]` |
| 5 | `type: game`、`platform: "xbox"` | 400，`fields: ["platform"]` |
| 6 | `type: book`、`platform: ps5`、`coverUrl: <合法 IGDB>` | 201；`platform`、`coverUrl` 为 `null`（非游戏忽略）；未请求 IGDB |
| 7 | 游戏条目编辑，`coverUrl` 与原值规范化后相同 | 200；**不再请求 IGDB**，宽高保持 |
| 8 | 游戏条目带 multipart `cover` 文件 | 400 `BAD_REQUEST`（游戏不接受上传封面） |

**预期结果：** 读回 `GET /api/admin/shelf/entries/:id` 与 `GET /api/shelf` 均含 `platform`、`coverUrl`、`coverWidth`、`coverHeight`；`/api/shelf` 中游戏的 `cover` 为 IGDB 地址

### TC-US01-27: IGDB 链接校验与防 SSRF

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-24 | P0 | security |

**前置条件：** `igdbStub`；`type: game`、`platform: ps5`

| # | `coverUrl` | 期望 |
|---|-----------|------|
| 1 | `https://example.com/a.jpg` | 400 `VALIDATION_FAILED`，`fields: ["coverUrl"]`；未发出请求 |
| 2 | `https://images.igdb.com.evil.example/igdb/image/upload/t_1080p/co8h3y.jpg` | 同 1 |
| 3 | `http://images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg` | 规范化为 https，成功 |
| 4 | `https://user:pw@images.igdb.com/igdb/image/upload/t_1080p/co8h3y.jpg`、带端口 `:8443`、路径 `/../`、图片 ID 含大写或 `/`、扩展名 `gif` | 400，`fields: ["coverUrl"]` |
| 5 | `…/t_1080p/nope000.jpg`（404） | 422 `COVER_LINK_UNREACHABLE`"封面链接打不开，请检查后重试"；不写库 |
| 6 | `…/t_1080p/co3xx01.jpg`（302 到他站） | 422 同上；**未跟随跳转**，未请求 `evil.example` |
| 7 | `…/t_1080p/coslow1.jpg`（挂起） | 8 秒内 422 同上（假计时器） |
| 8 | `…/t_1080p/cosvg01.jpg`（内容不是 jpg / png / webp） | 422 同上 |
| 9 | 超过 2,000 字符的字符串 | 400，`fields: ["coverUrl"]` |

**预期结果：** `igdbStub` 记录的请求主机只有 `images.igdb.com`；读取图片头最多 65,536 字节即中止

### TC-US01-28: 切换分类时平台与封面的处理

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-25 | P1 | api |

| 起始 | 操作 | 期望 |
|------|------|------|
| 书，有 R2 封面 | PUT 改为 `type: game`、`platform: switch`、`coverUrl: null` | 200；`cover: null`；原 R2 对象已删除；`platform: switch` |
| 书，有 R2 封面 | PUT 改为 `type: game`、`coverUrl: <合法>` | 200；`coverUrl` 为 t_1080p；原 R2 对象已删除 |
| 游戏，平台 switch、有 `coverUrl` | PUT 改为 `type: boardgame`（仍带 `platform`、`coverUrl`） | 200；`platform`、`coverUrl`、`coverWidth`、`coverHeight` 全为 `null` |
| 游戏，有 `coverUrl` | PUT `coverUrl: null` | 200；无封面；宽高为 `null` |

---

## UI 交互测试

### TC-US01-17: 空状态

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-03 | P1 | ui-interaction |

**步骤：** 无桌游条目时访问 `/admin/media?type=boardgame`

**预期结果：** 显示"还没有桌游条目"与"新增条目"按钮，无表格行

**playwright_hint：** `await expect(page.getByText('还没有桌游条目')).toBeVisible(); await expect(page.getByRole('row')).toHaveCount(0)`（若空状态不渲染表格）

### TC-US01-18: 新增表单默认值

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-04 | P1 | ui-interaction |

**前置：** `page.clock.setFixedTime('2026-10-21T08:00:00')`

**步骤：** 在电影标签点"新增条目"

**预期结果：** 分类选中"电影"；状态选中"看过"；标记日期 `2026-10-21`；其余为空

**playwright_hint：** `await expect(page.getByLabel('分类')).toHaveValue('movie'); await expect(page.getByLabel('标记日期')).toHaveValue('2026-10-21'); await expect(page.getByRole('radio', { name: '看过' })).toBeChecked()`

### TC-US01-19: 前端必填校验不发请求

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-07 | P1 | ui-interaction |

**步骤：** 标题填三个空格，填写作者，点"保存"；再填年份 `23`、标题 `x`，点"保存"

**预期结果：** 两次都不发出保存请求；分别提示"请填写标题""年份为 4 位数字"；作者等已填内容不变；焦点移到第一个出错字段

**playwright_hint：** `const req = page.waitForRequest(/shelf\/entries/, { timeout: 500 }).catch(() => null); await page.getByRole('button', { name: '保存' }).click(); expect(await req).toBeNull(); await expect(page.getByText('请填写标题')).toBeVisible()`

### TC-US01-20: 状态动词随分类切换

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-09 | P1 | ui-interaction |

**步骤：** 新增表单分类依次选 书 → 剧集 → 桌游；在"剧集"时选"在看"后再切到"桌游"

**预期结果：** 状态选项依次为"读过 / 在读""看过 / 在看""玩过 / 在玩"；切到桌游后"在玩"选中（保留 `in_progress`）

**playwright_hint：** `await page.getByLabel('分类').selectOption('boardgame'); await expect(page.getByRole('radio', { name: '在玩' })).toBeChecked()`

### TC-US01-21: 封面预览与拒绝提示

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-10, SC-MANAGE-11 | P1 | ui-interaction |

**步骤：** 1. 选择 jpg 封面　2. 再选择 svg　3. 再选择 6 MB jpg

**预期结果：** 1：显示预览图；2、3：提示"封面只支持 jpg / png / webp，且不超过 5 MB"，预览仍是步骤 1 的图

**playwright_hint：** `await page.getByLabel('封面').setInputFiles({ name: 'a.svg', mimeType: 'image/svg+xml', buffer }); await expect(page.getByRole('alert')).toContainText('不超过 5 MB')`

### TC-US01-22: 隐藏按钮切换文案与标记

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-14 | P1 | ui-interaction |

**步骤：** 点某行"隐藏"，再点"取消隐藏"

**预期结果：** 请求完成后该行出现"已隐藏"、按钮变"取消隐藏"；再点后恢复；行位置不变；请求中按钮禁用

**playwright_hint：** `const row = page.getByRole('row', { name: /e2e-.*原则/ }); await row.getByRole('button', { name: '隐藏' }).click(); await expect(row.getByText('已隐藏')).toBeVisible()`

### TC-US01-23: 删除确认框：确认 / 取消 / Esc

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-15, SC-MANAGE-16 | P0 | ui-interaction |

**步骤：** 1. 点"删除"→ 点"取消"　2. 点"删除"→ 按 Esc　3. 点"删除"→ 点"删除"

**预期结果：** 确认框为 `role="dialog"`，文案"删除「标题」？此操作不可撤销"，打开时焦点在"取消"；1、2：关闭、无 DELETE 请求、行仍在、焦点回到该行"删除"按钮；3：行消失，提示"已删除"

**playwright_hint：** `await expect(page.getByRole('dialog')).toContainText('此操作不可撤销'); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden()`

### TC-US01-24: 保存中加载态与防重复提交

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-17 | P1 | ui-interaction |

**前置：** `page.route` 把保存请求延迟 1s

**步骤：** 点"保存"后立即再点两次

**预期结果：** 按钮 `disabled` 并显示加载态；只发出 1 个请求

**playwright_hint：** `let n = 0; await page.route('**/api/admin/shelf/entries', async r => { n++; await new Promise(f => setTimeout(f, 1000)); await r.continue(); }); ... expect(n).toBe(1)`（计时相关打 `@timing`）

### TC-US01-25: 保存失败提示并保留内容

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-18 | P1 | ui-interaction |

**步骤：** `page.route` 让保存返回 500，填写表单点"保存"；再让请求 `abort()` 重试一次

**预期结果：** 两次都提示"保存失败，请重试"；表单仍打开、所填内容不变；按钮恢复可用

**playwright_hint：** `await page.route('**/api/admin/shelf/entries', r => r.fulfill({ status: 500 })); await expect(page.getByRole('alert')).toContainText('保存失败')`

### TC-US01-29: 表单：平台下拉、封面链接输入、预览比例与错误提示

| covers | Priority | type |
|--------|----------|------|
| SC-MANAGE-23, SC-MANAGE-24, SC-MANAGE-25 | P1 | ui-interaction |

**前置条件：** `page.route('https://images.igdb.com/**')` 返回夹具图片（`co8h3y` → 810×1080 jpg，其余 404）；打桩保存接口

**步骤：** 1. 打开 `/admin/media/new?type=game`　2. 粘贴 IGDB 链接　3. 把分类改为"书"再改回"游戏"　4. 填 `https://example.com/a.jpg` 保存　5. 保存接口返回 422 `COVER_LINK_UNREACHABLE`

**预期结果：** 1：有"平台"下拉，值 PS5，选项依次 PS5 / PS4 / Switch / Switch 2 / Steam；封面区无"上传"按钮、有"封面链接（IGDB）"输入框；2：预览 `<img>` 宽高比 = 810:1080（±1%），`object-fit: contain`；3：改为"书"时平台下拉消失、封面区恢复"上传"，改回"游戏"时平台仍为 PS5、链接仍在；4：前端不发请求，链接下提示"请粘贴 images.igdb.com 的封面图片地址"；5：链接下提示"封面链接打不开，请检查后重试"，表单内容保留

**playwright_hint：** `await expect(page.getByLabel('平台')).toHaveValue('ps5'); await expect(page.getByRole('button', { name: '上传' })).toHaveCount(0)`

---

## 追溯矩阵

| AC | Behaviors | TC |
|----|-----------|----|
| AC1 列表与分类 | SC-MANAGE-01, 02, 03 | TC-01, 02, 17 |
| AC2 新增默认值 | SC-MANAGE-04 | TC-18 |
| AC3 必填保存 + 重建 | SC-MANAGE-05 | TC-03, 10, 16 |
| AC4 校验 | SC-MANAGE-07, 08 | TC-04, 19 |
| AC5 封面上传 | SC-MANAGE-10, 11 | TC-05, 21 |
| AC6 在读 → 读过 | SC-MANAGE-12 | TC-06, 10 |
| AC7 隐藏 | SC-MANAGE-14 | TC-08, 10, 22 |
| AC8 删除 | SC-MANAGE-15, 16 | TC-09, 10, 23 |
| AC9 换封面 | SC-MANAGE-13 | TC-07 |
| AC10 鉴权 | SC-MANAGE-21, 22 | TC-13, 14 |
| AC11 游戏平台与 IGDB 封面 | SC-MANAGE-23, 24, 25 | TC-26, 27, 28, 29 |
| 约束：状态动词 / 豆瓣链接 / 重建失败 / 加载与失败态 | SC-MANAGE-06, 09, 17, 18, 19, 20 | TC-03, 15, 20, 24, 25, 11, 12 |
