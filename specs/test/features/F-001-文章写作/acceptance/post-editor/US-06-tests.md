# US-06 自动保存草稿 验收测试

**US ID**: US-06
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/post-editor/US-06-autosave-draft/behaviors.md)
**最后更新**: 2026-10-15
**Version Tag**: v1.3

> 验收用例从 behaviors.md 的 Given-When-Then 生成，叠加等价类、边界值（去抖 1.9s/2.0s、本地暂存时间戳新/旧/相等）、错误猜测（乱序响应、双标签页、重复创建）与状态转换。
> 接口路径为占位，**接口路径以 design-domain API 契约为准**：新建 `POST /api/admin/posts`；自动保存 `PUT /api/admin/posts/{id}`；读取 `GET /api/admin/posts/{id}`；读者页 `GET /posts/{slug}`。本地暂存 key 为 `mh:draft:{postId|new}`（已实现）。

---

## 测试数据策略

| 类别 | 策略 |
|------|------|
| 测试文章 | 每个 TC 经 API 创建独立文章，标题前缀 `[E2E-US06]` + 时间戳；已发布场景经 API 发布 |
| 时间控制 | 去抖与"已保存 · HH:mm"断言使用 `page.clock.install({ time: new Date('2026-10-10T14:32:00+08:00') })` + `page.clock.runFor(ms)`，不依赖真实等待 |
| 请求观测 | `page.on('request')` 统计 `PUT/POST **/api/admin/posts**` 次数与请求体 |
| 网络模拟 | 断网 `context.setOffline(true/false)`；失败 `page.route(..., r => r.abort())` 或 `fulfill({ status: 500/401 })`；乱序 `route` 内按请求序号设置不同延迟 |
| 本地暂存 | 通过 `page.evaluate` 读写 `localStorage`；预置暂存时 `savedAt` 相对服务端 `updatedAt` 精确偏移（+1min / -1min / 0） |
| DB 断言 | 经 `GET /api/admin/posts/{id}` 读取（或测试环境直接查询 D1），比较 `body`、`title`、`status`、`updatedAt` |
| 登录态 | `storageState` 复用；会话过期通过服务端删除会话（`POST /api/admin/logout` 用另一 context 调用）模拟 |

**通用文本数据**：

| 名称 | 值 |
|------|------|
| T1 | `第一段：自动保存测试。` |
| T2 | `第二段：继续写作 ✍️ 中英 mixed 123` |
| V1 / V2 | `V1` / `V2` |

---

## 测试用例列表

| TC ID | covers | 场景 | 类型 | 优先级 |
|-------|--------|------|------|--------|
| TC-US06-01 | SC-AUTOSAVE-01 | 停止输入 2 秒后保存，数据库与编辑区一致 | e2e | P0 |
| TC-US06-02 | SC-AUTOSAVE-01 | 边界：停止 1.9s 不保存，2.0s 保存 | e2e | P0 |
| TC-US06-03 | SC-AUTOSAVE-01 | 持续输入去抖，仅停止后保存 1 次 | e2e | P1 |
| TC-US06-04 | SC-AUTOSAVE-01 | 等价类：标题、文章信息修改同样触发 | e2e | P1 |
| TC-US06-05 | SC-AUTOSAVE-01, SC-AUTOSAVE-02 | 并发保存乱序返回，后者不被前者覆盖 | e2e | P0 |
| TC-US06-06 | SC-AUTOSAVE-01 | 双标签页编辑同一篇，后写覆盖且不报错 | e2e | P2 |
| TC-US06-07 | SC-AUTOSAVE-03 | 关闭后重开恢复最后保存内容 | e2e | P0 |
| TC-US06-08 | SC-AUTOSAVE-04 | 新建无标题文章保存为"无标题"，地址栏切换 | e2e | P0 |
| TC-US06-09 | SC-AUTOSAVE-04 | 新建后连续保存不重复创建文章 | e2e | P0 |
| TC-US06-10 | SC-AUTOSAVE-05 | 空白新建页离开不产生草稿 | e2e | P1 |
| TC-US06-11 | SC-AUTOSAVE-06 | 断网本地暂存，恢复后自动重试 | e2e | P0 |
| TC-US06-12 | SC-AUTOSAVE-06 | 服务端 500 / 请求中断后自动重试 | e2e | P1 |
| TC-US06-13 | SC-AUTOSAVE-07 | 本地暂存更新：提示并恢复 | e2e | P0 |
| TC-US06-14 | SC-AUTOSAVE-07 | 本地暂存更新：点击"丢弃" | e2e | P1 |
| TC-US06-15 | SC-AUTOSAVE-07 | 边界：本地暂存更旧 / 时间相等不提示 | e2e | P1 |
| TC-US06-16 | SC-AUTOSAVE-08 | 已发布文章自动保存，读者仍见 V1 | e2e | P0 |
| TC-US06-17 | SC-AUTOSAVE-08 | 自动保存接口不改变发布状态字段 | api | P0 |
| TC-US06-18 | SC-AUTOSAVE-10 | 会话过期：提示重新登录、本地暂存、登录后保存成功 | e2e | P0 |
| TC-US06-19 | SC-AUTOSAVE-10 | 未登录直调保存/新建接口返回 401 | security | P0 |
| TC-US06-20 | SC-AUTOSAVE-01 | 跨站 Origin 保存被拒（CSRF） | security | P1 |
| TC-US06-21 | SC-AUTOSAVE-01 | 保存接口响应时间 | performance | P2 |
| TC-US06-22 | SC-AUTOSAVE-02 | 状态转换：未保存 → 保存中… → 已保存 · 14:32 | ui-interaction | P0 |
| TC-US06-23 | SC-AUTOSAVE-02, SC-AUTOSAVE-06 | 状态转换：保存失败 → 重试 → 已保存 | ui-interaction | P0 |
| TC-US06-24 | SC-AUTOSAVE-02 | 保存中继续输入，完成后立即再保存、不误显示"已保存" | ui-interaction | P1 |
| TC-US06-25 | SC-AUTOSAVE-10 | 发布时会话过期跳登录页 | ui-interaction | P0 |
| TC-US06-26 | SC-AUTOSAVE-09 | "未保存"/"保存中…"时离开弹确认 | ui-interaction | P0 |
| TC-US06-27 | SC-AUTOSAVE-09 | "已保存"时离开不弹确认 | ui-interaction | P1 |
| TC-US06-28 | SC-AUTOSAVE-11 | Ctrl/Cmd+S 立即保存且不弹"保存网页" | ui-interaction | P0 |
| TC-US06-29 | SC-AUTOSAVE-11 | 去抖等待中按 Ctrl+S 只保存 1 次 | ui-interaction | P1 |

---

## TC-US06-01: 停止输入 2 秒后保存，数据库与编辑区一致

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-01 |
| covers | SC-AUTOSAVE-01 |
| Scenario | 草稿正文修改后停止 2 秒自动保存 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿 `[E2E-US06] basic`，正文为空
- 【环境前置】已登录；`page.clock` 已安装

**测试数据：** 输入 T1

**步骤：**
1. 打开 `/admin/posts/{id}`，在正文输入 T1
2. `page.clock.runFor(2000)`，等待保存响应
3. `GET /api/admin/posts/{id}`

**预期结果：**
- 发起 1 次 `PUT /api/admin/posts/{id}`，返回 2xx
- 数据库 `body` 严格等于 T1（含 emoji/中英文无编码损失）

**清理：** 删除文章

---

## TC-US06-02: 边界——停止 1.9s 不保存，2.0s 保存

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-02 |
| covers | SC-AUTOSAVE-01 |
| Scenario | 去抖阈值边界值 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（依赖 `page.clock` 精确推进） |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，正文为空
- 【环境前置】已登录；`page.clock` 已安装；保存请求计数器清零

**测试数据：** 输入 `a`

**步骤：**
1. 输入 `a`
2. `page.clock.runFor(1900)`，读取计数
3. `page.clock.runFor(100)`（累计 2000ms），读取计数

**预期结果：**
- 步骤 2：保存请求计数 = 0
- 步骤 3：保存请求计数 = 1

**清理：** 删除文章

---

## TC-US06-03: 持续输入去抖，仅停止后保存 1 次

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-03 |
| covers | SC-AUTOSAVE-01 |
| Scenario | 每 1.5s 输入一次、持续 6s，期间不保存；停止后 2s 只保存 1 次 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，正文为空
- 【环境前置】已登录；`page.clock` 已安装

**测试数据：** 依次输入 `1`、`2`、`3`、`4`，每次间隔 1500ms

**步骤：**
1. 循环 4 次：输入一个字符，`runFor(1500)`
2. 再 `runFor(500)`（距最后输入 2000ms）

**预期结果：**
- 步骤 1 结束时计数 = 0
- 步骤 2 后计数 = 1，请求体正文为 `1234`

**清理：** 删除文章

---

## TC-US06-04: 等价类——标题、文章信息修改同样触发

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-04 |
| covers | SC-AUTOSAVE-01 |
| Scenario | 修改来源等价类：标题 / 文章信息（摘要、标签等，见 US-03）/ 正文 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，标题 `原标题`，摘要为空
- 【环境前置】已登录；`page.clock` 已安装

**测试数据：**

| 修改项 | 新值 |
|--------|------|
| 标题 | `新标题 2026` |
| 摘要 | `这是摘要` |

**步骤：**
1. 修改标题，`runFor(2000)`，读取 DB
2. 修改摘要，`runFor(2000)`，读取 DB

**预期结果：**
- 每步各发起 1 次保存；DB `title` = `新标题 2026`，`summary` = `这是摘要`
- 仅聚焦/失焦而不修改任何值时不发起保存

**清理：** 删除文章

---

## TC-US06-05: 并发保存乱序返回，后者不被前者覆盖

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-05 |
| covers | SC-AUTOSAVE-01, SC-AUTOSAVE-02 |
| Scenario | 错误猜测：保存 #1 慢、保存 #2 快，#1 晚到不得覆盖 DB 或编辑区 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，正文为空
- 【环境前置】已登录；`page.route` 拦截保存请求：第 1 个请求延迟 3000ms 后 `continue()`，第 2 个不延迟

**测试数据：** 先输入 `AAA`，再追加 `BBB`

**步骤：**
1. 输入 `AAA`，停止 2s → 保存 #1 发出（挂起中）
2. 追加 `BBB`（正文 `AAABBB`），按 Ctrl+S 或停止 2s → 保存 #2
3. 等待两个请求均完成，再等 3s
4. 读取 DB；刷新页面

**预期结果：**
- DB `body` 最终 = `AAABBB`（前端串行化保存或服务端按版本拒绝过期写，二者其一，以设计为准）
- 编辑区内容始终为 `AAABBB`，不回退为 `AAA`
- 状态栏最终为"已保存 · HH:mm"，不出现 #1 返回后误显示的过期状态
- 刷新后编辑区为 `AAABBB`

**清理：** 删除文章

---

## TC-US06-06: 双标签页编辑同一篇，后写覆盖且不报错

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-06 |
| covers | SC-AUTOSAVE-01 |
| Scenario | 错误猜测（story 假设：单作者，多标签页后写覆盖） |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，正文 `基线`
- 【环境前置】同一 context 打开两个 page（tabA、tabB）

**测试数据：** tabA 正文改为 `来自A`；tabB 稍后改为 `来自B`

**步骤：**
1. tabA 修改并保存成功
2. tabB 修改并保存成功
3. 读取 DB

**预期结果：**
- 两次保存均返回 2xx，无 5xx、无页面报错
- DB `body` = `来自B`

**清理：** 删除文章

---

## TC-US06-07: 关闭后重开恢复最后保存内容

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-07 |
| covers | SC-AUTOSAVE-03 |
| Scenario | 已保存后关闭标签页，重新打开显示完整内容 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，正文为空
- 【环境前置】已登录

**测试数据：** 正文 `T1\nT2`（2 段，含 Markdown `**粗体**`）

**步骤：**
1. 输入正文，等待状态栏显示"已保存"
2. `page.close()`，新开 page 打开 `/admin/posts/{id}`

**预期结果：**
- 编辑区内容与步骤 1 输入逐字符一致
- 不显示"发现未同步的本地内容"提示

**清理：** 删除文章；清空 localStorage

---

## TC-US06-08: 新建无标题文章保存为"无标题"，地址栏切换

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-08 |
| covers | SC-AUTOSAVE-04 |
| Scenario | 标题为空时首次自动保存创建草稿 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】记录文章总数 N
- 【环境前置】已登录；`page.clock` 已安装

**测试数据：** 标题留空（另测标题仅含 3 个空格 `   ` 的等价情形）；正文 T1

**步骤：**
1. 打开新建文章页，输入正文 T1
2. `runFor(2000)`，等待创建响应

**预期结果：**
- 发起 1 次 `POST /api/admin/posts`，返回新 id
- DB 新增 1 篇文章（总数 N+1），`title` = `无标题`，`status` = 草稿，`body` = T1
- 地址栏变为 `/admin/posts/{id}`（`history.replaceState`，页面不刷新，编辑区光标与内容保留）
- 标题仅空格时同样保存为 `无标题`

**清理：** 删除新建文章

---

## TC-US06-09: 新建后连续保存不重复创建文章

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-09 |
| covers | SC-AUTOSAVE-04 |
| Scenario | 错误猜测：创建请求进行中再次触发保存，不得产生两篇文章 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】记录文章总数 N
- 【环境前置】`POST /api/admin/posts` 经 route 延迟 3s

**测试数据：** 正文 `A`，创建挂起期间追加 `B` 并按 Ctrl+S

**步骤：**
1. 新建页输入 `A`，停止 2s（创建请求挂起）
2. 追加 `B`，按 Ctrl+S
3. 等待所有请求结束，再输入 `C` 并停止 2s

**预期结果：**
- DB 文章总数 = N+1（仅 1 篇）
- `POST` 请求仅 1 次，其后均为 `PUT /api/admin/posts/{id}`
- 最终 `body` = `ABC`

**清理：** 删除新建文章

---

## TC-US06-10: 空白新建页离开不产生草稿

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-10 |
| covers | SC-AUTOSAVE-05 |
| Scenario | 未输入任何内容就离开，不新增文章 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】记录文章总数 N
- 【环境前置】已登录

**测试数据：**

| 子场景 | 操作 |
|--------|------|
| a | 打开后直接离开 |
| b | 点击标题与正文（聚焦/失焦）、停留 5s 后离开 |

**步骤：**
1. 打开新建文章页，按子场景操作，导航至 `/admin/posts`

**预期结果：**
- 不发起 `POST /api/admin/posts`；DB 文章总数仍为 N
- 离开时不弹出离开确认

**清理：** 无

---

## TC-US06-11: 断网本地暂存，恢复后自动重试

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-11 |
| covers | SC-AUTOSAVE-06 |
| Scenario | 离线保存失败 → 本地暂存 → 联网后自动重试成功并清除暂存 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（`context.setOffline`） |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，正文 `基线`，已保存
- 【环境前置】已登录；页面加载后 `context.setOffline(true)`

**测试数据：** 正文改为 `基线+离线内容`

**步骤：**
1. 修改正文，停止 2s
2. 读取 `localStorage['mh:draft:{id}']`
3. `context.setOffline(false)`，等待自动重试（不做任何操作）
4. 读取 DB 与 localStorage

**预期结果：**
- 步骤 1：状态栏显示"保存失败，将自动重试"
- 步骤 2：暂存存在，内容为 `基线+离线内容`，含 `savedAt` 时间戳
- 步骤 3：无用户操作下自动重新保存成功，状态栏显示"已保存"
- 步骤 4：DB `body` = `基线+离线内容`；本地暂存被清除

**清理：** 删除文章；清空 localStorage

---

## TC-US06-12: 服务端 500 / 请求中断后自动重试

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-12 |
| covers | SC-AUTOSAVE-06 |
| Scenario | 失败原因等价类：连接中断、5xx 与离线同样走失败 + 暂存 + 重试 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，正文为空
- 【环境前置】已登录

**测试数据：**

| 模拟 | 写法 | 首次失败后 |
|------|------|-----------|
| 中断 | `route.abort('connectionreset')` | `page.unroute` |
| 5xx | `route.fulfill({ status: 503 })` | `page.unroute` |

正文：`重试测试`

**步骤：**
1. 设置拦截，输入正文并停止 2s
2. 解除拦截，等待自动重试（重试间隔以实现为准，最长等待 30s）

**预期结果：**
- 失败时状态栏"保存失败，将自动重试"，暂存写入
- 解除后自动保存成功，状态栏"已保存"，暂存清除，DB `body` = `重试测试`

**清理：** 删除文章；清空 localStorage

---

## TC-US06-13: 本地暂存更新——提示并恢复

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-13 |
| covers | SC-AUTOSAVE-07 |
| Scenario | 本地 `savedAt` 晚于服务端 `updatedAt`，提示恢复，点击"恢复"后立即保存 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文 `服务端版本`，`updatedAt` = `2026-10-10T14:34:00+08:00`
- 【数据前置】打开页面前经 `addInitScript` 写入本地暂存：正文 `本地版本`，`savedAt` = `2026-10-10T14:35:00+08:00`
- 【环境前置】已登录；时区 `Asia/Shanghai`

**测试数据：** 见前置条件（本地比服务端新 1 分钟）

**步骤：**
1. 打开 `/admin/posts/{id}`
2. 点击"恢复本地内容"

**预期结果：**
- 步骤 1：显示提示条"发现未同步的本地内容，是否恢复？"、"本地暂存于 10月10日 14:35，比服务端版本更新。丢弃后无法找回。"及"丢弃本地内容"/"恢复本地内容"按钮；编辑区暂显示 `服务端版本`
- 步骤 2：编辑区替换为 `本地版本`；立即发起保存（不等 2s）；DB `body` = `本地版本`；提示条消失；本地暂存清除

**清理：** 删除文章；清空 localStorage

---

## TC-US06-14: 本地暂存更新——点击"丢弃"

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-14 |
| covers | SC-AUTOSAVE-07 |
| Scenario | 选择丢弃本地内容 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：** 同 TC-US06-13

**测试数据：** 同 TC-US06-13

**步骤：**
1. 打开文章，点击"丢弃本地内容"
2. 刷新页面

**预期结果：**
- 编辑区保持 `服务端版本`；不发起保存；DB 不变
- 本地暂存被清除；刷新后不再出现提示条

**清理：** 删除文章；清空 localStorage

---

## TC-US06-15: 边界——本地暂存更旧 / 时间相等不提示

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-15 |
| covers | SC-AUTOSAVE-07 |
| Scenario | 时间戳比较边界值：仅"严格更新"才提示 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿正文 `服务端版本`，`updatedAt` = `2026-10-10T14:34:00.000+08:00`
- 【环境前置】已登录

**测试数据：**

| 子场景 | 本地 `savedAt` | 预期 |
|--------|---------------|------|
| 更旧 | `14:33:00.000` | 不提示 |
| 相等 | `14:34:00.000` | 不提示 |
| 更新 1ms（对照） | `14:34:00.001` | 提示 |
| 其他文章的暂存 | key 为另一 id，`14:40` | 不提示 |

**步骤：**
1. 对每个子场景预置暂存后打开文章

**预期结果：**
- "更旧/相等/其他文章"：不显示提示条，编辑区为 `服务端版本`；过期暂存被清除（以实现为准，至少不影响后续保存）
- "更新 1ms"：显示提示条，说明中暂存时间为"10月10日 14:34"

**清理：** 删除文章；清空 localStorage

---

## TC-US06-16: 已发布文章自动保存，读者仍见 V1

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-16 |
| covers | SC-AUTOSAVE-08 |
| Scenario | 已发布文章修改并自动保存，只形成"未发布修改" |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】已发布文章，slug `e2e-us06-published`，正文 `V1`
- 【环境前置】已登录；读者页缓存可绕过或已预热

**测试数据：** 正文改为 `V2`

**步骤：**
1. 打开编辑页，正文改为 `V2`，等待"已保存"
2. 用全新未登录 context 访问 `/posts/e2e-us06-published`
3. 刷新编辑页

**预期结果：**
- 文章状态显示"已发布 · 有修改"
- 读者页正文为 `V1`，不含 `V2`
- 刷新后编辑页正文为 `V2`

**清理：** 删除文章（含已发布版本）

---

## TC-US06-17: 自动保存接口不改变发布状态字段

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-17 |
| covers | SC-AUTOSAVE-08 |
| Scenario | 约束"自动保存不得改变文章的发布状态"，草稿/已发布两类状态 |
| Priority | P0 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（保存请求体为七字段整份工作稿；附加 status 被忽略并返回 200） |

**前置条件：**
- 【数据前置】草稿文章 P1；已发布文章 P2（`publishedAt` = T0，正文 `V1`）
- 【环境前置】已登录

**测试数据：** 保存请求体为整份工作稿（`DraftInput` 七个字段，以各自当前工作稿为底），`body` 改为 `V2`；越权请求体为同样的整份工作稿，`body` 改为 `V3`，另附加 `"status": "published"`

**步骤：**
1. 对 P1、P2 调用自动保存接口
2. 对 P1 发送附加 `status` 字段的请求
3. 读取 P1、P2

**预期结果：**
- 步骤 2 返回 200，附加的 `status` 被忽略：P1 `status` 仍为草稿，`body` = `V3`
- P2 `status` 仍为已发布，`publishedAt` = T0，读者可见正文仍为 `V1`，存在未发布修改标记

**清理：** 删除 P1、P2

---

## TC-US06-18: 会话过期——本地暂存、跳登录页、登录后恢复并保存

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-18 |
| covers | SC-AUTOSAVE-10 |
| Scenario | 自动保存收到 401 后不丢内容，重新登录回到原文章，恢复后保存成功 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-14 v1.1 按 UI 决定 #3 改为跳登录页（作者确认） |

**前置条件：**
- 【数据前置】草稿，正文 `基线`
- 【环境前置】已登录打开编辑页后使会话失效（E2E 用清除 Cookie 模拟）；监听 dialog 事件

**测试数据：** 正文改为 `基线+过期后输入`；管理员测试账号

**步骤：**
1. 修改正文，停止 2s（保存收到 401）
2. 读取 `localStorage['mh:draft:{id}']`
3. 在登录页登录
4. 回到编辑页，点击"恢复本地内容"

**预期结果：**
- 步骤 1：不弹离开确认，跳转到 `/admin/login?next=%2Fadmin%2Fposts%2F{id}`
- 步骤 2：暂存包含 `基线+过期后输入`
- 步骤 3：登录后回到 `/admin/posts/{id}`，编辑区为 `基线`，显示本地内容恢复横幅
- 步骤 4：编辑区为 `基线+过期后输入`，保存成功（"已保存"），DB `body` = `基线+过期后输入`

**清理：** 删除文章；清空 localStorage

---

## TC-US06-19: 未登录直调保存/新建接口返回 401

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-19 |
| covers | SC-AUTOSAVE-10 |
| Scenario | 权限：访客 / 已登出 / 伪造 Cookie 不能写入 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿 P，正文 `基线`；记录文章总数 N

**测试数据：** 身份同 US-05 TC-US05-17（无 Cookie / 已登出 Cookie / `session=deadbeefdeadbeefdeadbeef`）；请求体 `{ "body": "篡改" }`

**步骤：**
1. 以三种身份分别调用 `PUT /api/admin/posts/{P.id}` 与 `POST /api/admin/posts`

**预期结果：**
- 均返回 401
- P 的 `body` 仍为 `基线`；文章总数仍为 N

**清理：** 删除 P

---

## TC-US06-20: 跨站 Origin 保存被拒（CSRF）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-20 |
| covers | SC-AUTOSAVE-01 |
| Scenario | 已登录但 Origin 非本站，保存被拒（nfr §2.2） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿 P，正文 `基线`
- 【环境前置】持有有效会话 Cookie

**测试数据：** `Origin: https://evil.example.com`；请求体 `{ "body": "篡改" }`

**步骤：**
1. 调用 `PUT /api/admin/posts/{P.id}`

**预期结果：**
- 返回 403（以契约为准）；P 的 `body` 仍为 `基线`

**清理：** 删除 P

---

## TC-US06-21: 保存接口响应时间

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-21 |
| covers | SC-AUTOSAVE-01 |
| Scenario | NFR：写作接口 P95 < 500ms（nfr §1） |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（Cloudflare 测试环境） |
| type | performance |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿 P
- 【环境前置】部署于 Cloudflare 测试环境；已登录

**测试数据：** 正文 20,000 字符（中文），串行保存 100 次，每次末尾追加序号

**步骤：**
1. 串行调用保存接口 100 次，记录服务端耗时

**预期结果：**
- P95 < 500ms；100 次全部 2xx；最终 `body` 以序号 100 结尾

**清理：** 删除 P

---

## UI 交互测试

### TC-US06-22: 状态转换——未保存 → 保存中… → 已保存 · 14:32

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-22 |
| covers | SC-AUTOSAVE-02 |
| Scenario | 正常保存路径的状态栏文案 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，正文为空
- 【环境前置】`page.clock.install({ time: new Date('2026-10-10T14:32:00+08:00') })`；保存请求经 route 延迟 1000ms；时区 `Asia/Shanghai`

**测试数据：** 输入 `x`

**步骤：**
1. 输入 `x`
2. `runFor(2000)`
3. 等待保存响应

**预期结果：**
- 步骤 1：状态栏"未保存"
- 步骤 2：状态栏"保存中…"
- 步骤 3：状态栏"已保存 · 14:32"

**playwright_hint：**
```ts
const status = page.getByTestId('save-status'); // 或 getByRole('status')
await editor.type('x');
await expect(status).toHaveText('未保存');
await page.clock.runFor(2000);
await expect(status).toHaveText('保存中…');
await expect(status).toHaveText('已保存 · 14:32');
```

**清理：** 删除文章

---

### TC-US06-23: 状态转换——保存失败 → 重试 → 已保存

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-23 |
| covers | SC-AUTOSAVE-02, SC-AUTOSAVE-06 |
| Scenario | 失败分支的状态栏文案与恢复 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，正文为空
- 【环境前置】`context.setOffline(true)`

**测试数据：** 输入 `离线`

**步骤：**
1. 输入，停止 2s
2. `context.setOffline(false)`

**预期结果：**
- 状态序列：未保存 → 保存中… → 保存失败，将自动重试 → 保存中… → 已保存 · HH:mm
- 失败期间编辑区可继续输入，输入后状态保持失败提示或"未保存"，不丢字

**playwright_hint：**
```ts
await context.setOffline(true);
await editor.type('离线');
await expect(status).toHaveText('保存失败，将自动重试', { timeout: 5000 });
await context.setOffline(false);
await expect(status).toHaveText(/^已保存 · \d{2}:\d{2}$/, { timeout: 30000 });
```

**清理：** 删除文章；清空 localStorage

---

### TC-US06-24: 保存中继续输入，完成后显示"未保存"

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-24 |
| covers | SC-AUTOSAVE-02 |
| Scenario | 错误猜测：保存中有新修改时，第一次保存完成后立即再保存（不再等 2 秒），且不误显示"已保存" |
| Priority | P1 |
| Version Tag | v1.1 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-15 v1.1 期望值同步现行契约（保存中有新编辑：完成后立即再保存，不再等 2 秒） |

**前置条件：**
- 【环境前置】保存请求延迟 2000ms；`page.clock` 已安装

**测试数据：** 输入 `A`，保存中追加 `B`

**步骤：**
1. 输入 `A`，`runFor(2000)`，状态为"保存中…"
2. 追加 `B`
3. 第一次保存响应返回

**预期结果：**
- 步骤 2 期间不发出第二个保存请求（同一时间最多一个在途请求），状态栏保持"保存中…"
- 步骤 3 后不等去抖（时钟不再前进）立即发出第二次 `PUT`，请求体 `body` = `AB`；两次保存之间状态栏不出现"已保存"
- 第二次保存完成后显示"已保存 · HH:mm"，DB `body` = `AB`

**playwright_hint：**
```ts
await editor.type('B');
const second = page.waitForRequest(r => r.method() === 'PUT' && r.postDataJSON()?.body === 'AB');
await second; // 第一次响应返回后立即发出，无需再推进 2 秒去抖
await expect(status).toHaveText(/已保存 · \d{2}:\d{2}/);
```

**清理：** 删除文章

---

### TC-US06-25: 发布时会话过期跳登录页

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-25 |
| covers | SC-AUTOSAVE-10 |
| Scenario | 发布请求返回 401 时与自动保存同样处理 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建；2026-10-14 v1.1 按 UI 决定 #3 改为跳登录页（原为新窗口登录，作者确认） |

**前置条件：**
- 【环境前置】已登录打开草稿编辑页后使会话失效（清除 Cookie）

**步骤：**
1. 点击"发布"
2. 在登录页登录

**预期结果：**
- 步骤 1：跳转到 `/admin/login?next=%2Fadmin%2Fposts%2F{id}`，不弹离开确认
- 步骤 2：回到写文章页；没有未保存的修改，不显示恢复横幅（暂存与服务端内容相同，被清除）

**清理：** 删除文章；清空 localStorage

---

### TC-US06-26: "未保存"/"保存中…"时离开弹确认

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-26 |
| covers | SC-AUTOSAVE-09 |
| Scenario | 两种未完成状态下关闭标签页/后退均触发 beforeunload |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（监听 `dialog` 事件 type = `beforeunload`） |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿
- 【环境前置】子场景"保存中…"：保存请求 route 挂起 10s

**测试数据：**

| 子场景 | 状态 | 离开方式 |
|--------|------|---------|
| a | 未保存 | `page.close({ runBeforeUnload: true })` |
| b | 未保存 | `page.goBack()` |
| c | 保存中… | `page.close({ runBeforeUnload: true })` |

**步骤：**
1. 制造对应状态后执行离开操作

**预期结果：**
- 每种情况均触发 `beforeunload` 对话框；`dismiss()` 后页面与内容保留

**playwright_hint：**
```ts
const dlg = page.waitForEvent('dialog');
await page.close({ runBeforeUnload: true });
expect((await dlg).type()).toBe('beforeunload');
await (await dlg).dismiss();
```

**清理：** 删除文章

---

### TC-US06-27: "已保存"时离开不弹确认

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-27 |
| covers | SC-AUTOSAVE-09 |
| Scenario | 无未保存修改时可直接离开 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【数据前置】草稿，修改后状态栏为"已保存"

**测试数据：** 无

**步骤：**
1. `page.close({ runBeforeUnload: true })`；另一子场景点击站内链接离开

**预期结果：**
- 未触发任何 `dialog` 事件，页面正常关闭/跳转

**playwright_hint：**
```ts
let fired = false; page.on('dialog', () => { fired = true; });
await expect(status).toHaveText(/^已保存/);
await page.close({ runBeforeUnload: true });
expect(fired).toBe(false);
```

**清理：** 删除文章

---

### TC-US06-28: Ctrl/Cmd+S 立即保存且不弹"保存网页"

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-28 |
| covers | SC-AUTOSAVE-11 |
| Scenario | 快捷键手动保存，阻止浏览器默认行为 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化（"保存网页"对话框以 `keydown` 事件 `defaultPrevented` 断言替代） |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】`page.clock` 已安装；Windows/Linux 用 `Control+s`，macOS 用 `Meta+s`

**测试数据：** 输入 `快捷键`

**步骤：**
1. 输入后立即（`runFor(100)`）按 `Control+s`

**预期结果：**
- 不推进时钟即发起 1 次保存请求（不等待 2s）
- `keydown` 事件 `defaultPrevented === true`；无下载/保存对话框
- 之后 `runFor(2000)` 不再产生额外保存请求

**playwright_hint：**
```ts
await page.evaluate(() => document.addEventListener('keydown', e => { (window as any).__prevented = e.defaultPrevented; }, { capture: false }));
const req = page.waitForRequest(r => r.method() === 'PUT' && r.url().includes('/api/admin/posts'));
await page.keyboard.press(process.platform === 'darwin' ? 'Meta+s' : 'Control+s');
await req;
expect(await page.evaluate(() => (window as any).__prevented)).toBe(true);
```

**清理：** 删除文章

---

### TC-US06-29: 去抖等待中按 Ctrl+S 只保存 1 次

| 字段 | 值 |
|------|------|
| TC-ID | TC-US06-29 |
| covers | SC-AUTOSAVE-11 |
| Scenario | 错误猜测：手动保存应取消挂起的去抖定时器，避免重复保存；连按多次不并发 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ 适合自动化 |
| type | ui-interaction |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件：**
- 【环境前置】`page.clock` 已安装；保存请求计数器清零

**测试数据：** 输入 `abc`；连按 `Control+s` 3 次（间隔 50ms）

**步骤：**
1. 输入 `abc`，`runFor(1000)`，连按 3 次 Ctrl+S
2. `runFor(3000)`

**预期结果：**
- 保存请求计数 = 1（内容无变化的重复按键不再发请求）
- 状态栏最终"已保存 · HH:mm"

**playwright_hint：**
```ts
for (let i = 0; i < 3; i++) await page.keyboard.press('Control+s');
await page.clock.runFor(3000);
expect(saveCount).toBe(1);
```

**清理：** 删除文章

---

## 覆盖矩阵

| SC-ID | Behavior | TC-IDs |
|-------|----------|--------|
| SC-AUTOSAVE-01 | BH-01 停止输入 2 秒后保存 | TC-US06-01, TC-US06-02, TC-US06-03, TC-US06-04, TC-US06-05, TC-US06-06, TC-US06-20, TC-US06-21 |
| SC-AUTOSAVE-02 | BH-02 保存状态栏 | TC-US06-05, TC-US06-22, TC-US06-23, TC-US06-24 |
| SC-AUTOSAVE-03 | BH-03 关闭后重开恢复 | TC-US06-07 |
| SC-AUTOSAVE-04 | BH-04 新建无标题保存 | TC-US06-08, TC-US06-09 |
| SC-AUTOSAVE-05 | BH-05 空白新建不产生草稿 | TC-US06-10 |
| SC-AUTOSAVE-06 | BH-06 断网暂存与重试 | TC-US06-11, TC-US06-12, TC-US06-23 |
| SC-AUTOSAVE-07 | BH-07 本地内容更新提示恢复 | TC-US06-13, TC-US06-14, TC-US06-15 |
| SC-AUTOSAVE-08 | BH-08 已发布文章不影响读者 | TC-US06-16, TC-US06-17 |
| SC-AUTOSAVE-09 | BH-09 离开页面确认 | TC-US06-26, TC-US06-27 |
| SC-AUTOSAVE-10 | BH-10 会话过期 | TC-US06-18, TC-US06-19, TC-US06-25 |
| SC-AUTOSAVE-11 | BH-11 Ctrl/Cmd+S 立即保存 | TC-US06-28, TC-US06-29 |

| 验收标准（story.md §2） | TC-IDs |
|------------------------|--------|
| AC1 停止输入 2 秒自动保存 | TC-US06-01 ~ 04 |
| AC2 保存中/未保存状态 | TC-US06-22, TC-US06-24 |
| AC3 断网失败、本地暂存、恢复重试 | TC-US06-11, TC-US06-12, TC-US06-23 |
| AC4 重开显示最后保存内容 / 本地更新提示 | TC-US06-07, TC-US06-13 ~ 15 |
| AC5 新建无标题 | TC-US06-08, TC-US06-09 |
| AC6 已发布只保存未发布修改 | TC-US06-16, TC-US06-17 |
| AC7 离开确认 | TC-US06-26, TC-US06-27 |
| 约束：不改变发布状态 | TC-US06-17 |
| 假设：多标签页后写覆盖 | TC-US06-06 |

**Gap 检查**：behaviors.md 中 SC-AUTOSAVE-01 ~ SC-AUTOSAVE-11 共 11 个 SC-ID，均有 ≥ 1 个 TC 覆盖。

**Gap: 无**

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | v1.0 | 初始创建 | miraclehifi |
| 2026-10-15 | v1.3 | 期望值同步现行契约（sync-f001-acceptance-expectations）：TC-17 请求体为七字段整份工作稿、附加 `status` 被忽略；TC-24 保存中有新编辑时完成后立即再保存（editor module-spec §2） | miraclehifi |
| 2026-10-14 | v1.2 | TC-18 / 25 按 UI 决定 #3 改为暂存后跳登录页（原为新窗口登录，作者确认） | miraclehifi |
| 2026-10-14 | v1.1 | 暂存 key 改为 `mh:draft:`；TC-13 / 14 / 15 横幅文案与按钮名按设计稿 | miraclehifi |
