# 管理员登出 验收测试

**US ID**: US-02
**所属分组**: admin-auth
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/admin-auth/US-02-admin-logout/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/admin-auth/US-02-admin-logout/behaviors.md)
**最后更新**: 2026-10-10
**Version Tag**: v1.0
**状态**: draft

> 验收测试用例由 behaviors.md 的 Given-When-Then 生成，并按等价类、边界值、错误猜测、状态转换补充。
> 文中接口路径（`POST /api/admin/logout`、`POST /api/admin/login`、文章 / 图片写接口）均为占位，**接口路径以 design-domain API 契约为准**；behaviors 未明确的状态码（如 403/405）同样以 API 契约为准。

---

## 测试用例列表

| TC ID | covers | 场景 | 类型 | Priority |
|-------|--------|------|------|----------|
| TC-US02-01 | SC-LOGOUT-01 | 有效会话调用登出接口，Cookie 被清除 | api | P0 |
| TC-US02-02 | SC-LOGOUT-01 | 从后台不同页面点击"登出"回到登录页（等价类） | e2e | P0 |
| TC-US02-03 | SC-LOGOUT-02 | 登出后携带旧 Cookie 调用保存文章接口返回 401 | api | P0 |
| TC-US02-04 | SC-LOGOUT-02 | 旧 Cookie 对全部写接口与后台页面均被拒绝（权限矩阵） | security | P0 |
| TC-US02-05 | SC-LOGOUT-02 | 会话状态转换：有效 → 登出 → 重新登录 | api | P1 |
| TC-US02-06 | SC-LOGOUT-02 | 多会话：登出 A 后 A 失效，B 的行为符合设计 | api | P2 |
| TC-US02-07 | SC-LOGOUT-04 | 无 Cookie 调用登出返回成功并指向登录页 | api | P1 |
| TC-US02-08 | SC-LOGOUT-04 | 伪造 / 过期 / 已登出 Cookie 调用登出不报错（等价类） | api | P1 |
| TC-US02-09 | SC-LOGOUT-04 | 同一会话重复登出两次均成功（幂等） | api | P2 |
| TC-US02-10 | SC-LOGOUT-01 | 登出接口 CSRF：外域 / 缺失 Origin 不能登出 | security | P1 |
| TC-US02-11 | SC-LOGOUT-01 | 登出不能通过 GET 触发（防 `<img>` 式 CSRF） | security | P2 |
| TC-US02-12 | SC-LOGOUT-01 | 登出后浏览器"后退"不显示后台内容 | security | P1 |
| TC-US02-13 | SC-LOGOUT-03 | UI：有未保存修改点"登出"弹出确认，取消后留在原页 | ui-interaction | P0 |
| TC-US02-14 | SC-LOGOUT-03 | UI：确认弹窗中选择确定后完成登出 | ui-interaction | P1 |
| TC-US02-15 | SC-LOGOUT-03, SC-LOGOUT-01 | UI：无未保存修改时不弹窗，直接登出 | ui-interaction | P1 |
| TC-US02-16 | SC-LOGOUT-03 | UI：保存完成后修改状态复位，不再弹窗 | ui-interaction | P2 |
| TC-US02-17 | SC-LOGOUT-01 | NFR：登出过程不泄露 Token，清除 Cookie 属性正确 | security | P1 |

---

## 测试数据策略

| 数据 | 策略 | 说明 |
|------|------|------|
| 管理员凭据 | **共享只读 Fixture** `admin-credentials`（与 US-01 共用） | 账号 `test-admin`、密码 `Test-Passw0rd!`，由测试环境 Secrets 注入哈希，明文从 `TEST_ADMIN_PASSWORD` 读取；禁止使用生产凭据；任何用例不得修改 |
| 会话 | **Factory** `createSession({ ageDays? })` | 每个用例通过登录接口获取独立会话；需要"过期会话"时回拨 D1 会话记录时间或使用 Fake Clock |
| 文章 / 图片 | **Factory** `createPost()`、**Seed** 测试 D1 | 标题 / slug 前缀 `tc-us02-`；清理阶段按前缀删除 |
| 上传图片 | **Fixture** `fixtures/test-image.png`（1×1 PNG） | 只读 |
| 登录限流 | **每用例 IP 隔离** | 每个用例登录时使用唯一 `CF-Connecting-IP`（`198.51.100.2xx`，RFC 5737 文档保留段），避免与 US-01 限流用例互相影响；或用例前重置该 IP 计数 |

**独立性**：每个用例自建会话与数据，不依赖执行顺序；清理后回到"无有效会话、无 `tc-us02-` 前缀数据"的已知状态。
**环境约定**：测试环境地址记为 `{BASE}`（HTTPS）；合法 Origin 即 `{BASE}` 的 origin。

---

## 功能验收测试

### TC-US02-01: 有效会话调用登出接口，Cookie 被清除

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-01 |
| covers | SC-LOGOUT-01 |
| Scenario | 登出清除会话 Cookie 并指向登录页 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】Factory 获取有效会话 `S`
- 【环境前置】`Origin: {BASE}`

**测试数据**：会话 Cookie `S`

**步骤**
1. 携带 `S` 调用 `POST /api/admin/logout`

**预期结果**
- 返回成功：302/303 `Location: /admin/login`，或 2xx 且响应指示跳转 `/admin/login`（以 API 契约为准）
- `Set-Cookie` 清除会话 Cookie：同名、值为空、`Max-Age=0` 或 `Expires` 为过去时间，且 `Path` 与签发时一致

**清理**：无（会话已失效）

---

### TC-US02-02: 从后台不同页面点击"登出"回到登录页

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-02 |
| covers | SC-LOGOUT-01 |
| Scenario | 后台任意页面点击顶部"登出" |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】每组新登录；Factory 预建文章 `tc-us02-02`（ID 记为 `{id}`）
- 【环境前置】浏览器上下文已登录

**测试数据**（等价类，参数化起始页）：`/admin`；`/admin/posts/new`（未输入任何内容）；`/admin/posts/{id}/edit`（未修改）

**步骤**
1. 打开起始页
2. 点击顶部"登出"
3. 再访问 `{BASE}/admin`

**预期结果**
- 步骤 2 后 URL 为 `{BASE}/admin/login`
- 浏览器上下文中不再有会话 Cookie
- 步骤 3 被跳转到登录页

**清理**：删除测试文章

---

### TC-US02-03: 登出后携带旧 Cookie 调用保存文章接口返回 401

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-03 |
| covers | SC-LOGOUT-02 |
| Scenario | 登出使服务端会话失效，不仅删除浏览器 Cookie |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】有效会话 `S`；用 `S` 预建文章 `tc-us02-03`，记录 D1 行快照

**测试数据**：保存请求体 `{"title":"tc-us02-03-changed","content":"changed"}`

**步骤**
1. 保存 `S` 的值
2. 用 `S` 调用登出
3. 手动携带旧值 `S` 调用 `PUT /api/admin/posts/{id}`（`Origin: {BASE}`）

**预期结果**
- 步骤 3 返回 **401**
- D1 中文章标题、内容、更新时间与快照一致

**清理**：重新登录删除测试文章；登出

---

### TC-US02-04: 旧 Cookie 对全部写接口与后台页面均被拒绝

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-04 |
| covers | SC-LOGOUT-02 |
| Scenario | 权限矩阵：已登出会话 vs 有效会话 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】会话 `S_old`（已登出）与会话 `S_new`（有效，另行登录）；文章 `tc-us02-04` 快照；R2 对象计数

**测试数据**（权限矩阵）

| 类别 | 请求 | `S_old`（已登出） | `S_new`（对照） |
|------|------|------------------|----------------|
| 后台页面 | `GET /admin` | 跳转 `/admin/login` | 200 |
| 创建文章 | `POST /api/admin/posts` | 401 | 2xx |
| 保存文章 | `PUT /api/admin/posts/{id}` | 401 | 2xx |
| 发布文章 | `POST /api/admin/posts/{id}/publish` | 401 | 2xx |
| 删除文章 | `DELETE /api/admin/posts/{id}` | 401 | 2xx |
| 上传图片 | `POST /api/admin/images` | 401 | 2xx |

**步骤**
1. 先用 `S_old` 依次调用全部请求，检查数据快照
2. 再用 `S_new` 依次调用（删除放最后）

**预期结果**
- 结果如上表；步骤 1 后 D1 / R2 无任何变化

**清理**：删除 `S_new` 上传的 R2 对象与残留文章；登出 `S_new`

---

### TC-US02-05: 会话状态转换——有效 → 登出 → 重新登录

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-05 |
| covers | SC-LOGOUT-02 |
| Scenario | 已登出会话不会因重新登录而"复活" |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】独立登录 IP `198.51.100.205`

**测试数据**：正确凭据

**步骤与预期**

| 步骤 | 状态 | 操作 | 预期 |
|------|------|------|------|
| 1 | 无 → 有效 | 登录 | 获得 `S1` |
| 2 | 有效 | `S1` 调保存接口 | 2xx |
| 3 | 有效 → 已登出 | `S1` 登出 | 成功 |
| 4 | 已登出 → 有效 | 重新登录 | 获得 `S2`，`S2 ≠ S1` |
| 5 | — | `S1` 调保存接口 | 401 |
| 6 | — | `S2` 调保存接口 | 2xx |

**清理**：删除测试文章；登出 `S2`

---

### TC-US02-06: 多会话——登出 A 后 A 失效，B 的行为符合设计

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-06 |
| covers | SC-LOGOUT-02 |
| Scenario | 同一管理员在两台设备登录，其中一台登出 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】两次独立登录得到 `S_A`、`S_B`

**测试数据**：保存文章请求（文章由 Factory 预建）

**步骤**
1. `S_A` 登出
2. `S_A`、`S_B` 分别调用保存文章接口

**预期结果**
- `S_A` 返回 401（必须）
- `S_B`：当前假设"仅当前会话失效"→ 返回 2xx；若 design-domain 决定"登出即全部会话失效"，则改为 401 并更新本用例

**清理**：删除测试文章；登出 `S_B`

---

### TC-US02-07: 无 Cookie 调用登出返回成功并指向登录页

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-07 |
| covers | SC-LOGOUT-04 |
| Scenario | 未登录状态调用登出不报错 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】无 Cookie 的客户端；`Origin: {BASE}`

**测试数据**：无

**步骤**
1. `POST /api/admin/logout`

**预期结果**
- 返回与 TC-US02-01 相同的成功响应（指向 `/admin/login`），**非** 401/4xx/5xx
- 浏览器场景下最终落在 `{BASE}/admin/login`

**清理**：无

---

### TC-US02-08: 伪造 / 过期 / 已登出 Cookie 调用登出不报错

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-08 |
| covers | SC-LOGOUT-04 |
| Scenario | 各类无效会话调用登出均幂等成功 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】已登出会话 `S_old`；过期会话 `S_exp`（Factory `ageDays: 7d0h1m`）；另一有效会话 `S_live`（用于确认不被误伤）

**测试数据**（等价类）：随机伪造值（与真实 Token 等长）；`S_old`；`S_exp`；空值；超长值（4,000 字符）；`' OR '1'='1`

**步骤**
1. 逐个携带上述值调用 `POST /api/admin/logout`
2. 用 `S_live` 调用保存文章接口

**预期结果**
- 步骤 1 均返回成功并指向 `/admin/login`，无 4xx/5xx，并下发清除 Cookie
- 步骤 2 返回 2xx（伪造值未误删其他有效会话）

**清理**：删除测试数据；登出 `S_live`

---

### TC-US02-09: 同一会话重复登出两次均成功

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-09 |
| covers | SC-LOGOUT-04 |
| Scenario | 幂等：重复提交 / 双击登出 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】有效会话 `S`

**测试数据**：`S`

**步骤**
1. 携带 `S` **并发**发送两次登出请求
2. 再顺序发送一次

**预期结果**
- 三次均返回成功，无 5xx

**清理**：无

---

### TC-US02-10: 登出接口 CSRF——外域 / 缺失 Origin 不能登出

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-10 |
| covers | SC-LOGOUT-01 |
| Scenario | 外站不能强制管理员登出（Logout CSRF） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】有效会话 `S`

**测试数据**：Origin 变体：缺失；`https://evil.example.com`；`null`

**步骤**
1. 携带 `S` 与各 Origin 变体调用 `POST /api/admin/logout`
2. 携带 `S` 调用保存文章接口（合法 Origin）

**预期结果**
- 步骤 1 被拒绝（403，以 API 契约为准），不下发清除 Cookie
- 步骤 2 返回 2xx（会话未被外站登出）

> 注：与 SC-LOGOUT-04"无会话时登出幂等成功"不冲突——Origin 校验先于会话判断；若设计决定登出不做 Origin 校验，需在 design-domain 记录风险接受并删除本用例。

**清理**：删除测试数据；登出

---

### TC-US02-11: 登出不能通过 GET 触发

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-11 |
| covers | SC-LOGOUT-01 |
| Scenario | 错误猜测：`<img src="/api/admin/logout">` 式攻击 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】有效会话 `S`

**测试数据**：`GET /api/admin/logout`（携带 `S`，无 Origin）

**步骤**
1. 发送 GET
2. 携带 `S` 调用保存文章接口

**预期结果**
- 步骤 1 返回 405 / 404（以 API 契约为准），不下发清除 Cookie
- 步骤 2 返回 2xx

**清理**：删除测试数据；登出

---

### TC-US02-12: 登出后浏览器"后退"不显示后台内容

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-12 |
| covers | SC-LOGOUT-01 |
| Scenario | 公共设备场景：后退 / bfcache 不泄露后台页面 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】已登录；Factory 预建文章 `tc-us02-12-secret-draft`（草稿）

**测试数据**：草稿标题 `tc-us02-12-secret-draft`

**步骤**
1. 打开 `/admin`（可见草稿标题）
2. 点击"登出"
3. 执行浏览器后退（`page.goBack()`）

**预期结果**
- 后退后页面不显示 `tc-us02-12-secret-draft`；被跳转到登录页或重新请求后被拦截
- `/admin/**` 响应头含 `Cache-Control: no-store`（或等价禁止缓存设置）

**清理**：删除测试文章

---

## UI 交互测试

### TC-US02-13: 有未保存修改点"登出"弹出确认，取消后留在原页

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-13 |
| covers | SC-LOGOUT-03 |
| Scenario | 有未保存修改时登出先提示，取消后保持登录 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| playwright_hint | `await page.getByRole('button', { name: '登出' }).click(); const dlg = page.getByRole('dialog'); await expect(dlg).toContainText('有未保存的修改，确定登出吗？'); await dlg.getByRole('button', { name: '取消' }).click(); await expect(page).toHaveURL(/\/admin\/posts\/.+\/edit/)`（若采用原生 `confirm()`，改用 `page.once('dialog', d => { expect(d.message()).toBe('有未保存的修改，确定登出吗？'); d.dismiss(); })`） |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】已登录；Factory 预建文章 `tc-us02-13`
- 【环境前置】打开该文章编辑页；拦截 / 延迟自动保存请求，确保修改处于"未保存"状态（NFR 要求草稿自动保存，需避免测试期间被自动保存掉）

**测试数据**：在正文末尾追加 `未保存内容-tc-us02-13`

**步骤**
1. 在编辑器中输入测试数据（不保存）
2. 点击顶部"登出"
3. 在确认弹窗中点击"取消"

**预期结果**
- 步骤 2 弹出确认，文案为"有未保存的修改，确定登出吗？"；此时未发出登出请求
- 步骤 3 后停留在编辑页，编辑器仍含 `未保存内容-tc-us02-13`
- 会话仍有效：保存文章接口返回 2xx

**清理**：删除测试文章；登出

---

### TC-US02-14: 确认弹窗中选择确定后完成登出

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-14 |
| covers | SC-LOGOUT-03 |
| Scenario | 有未保存修改时确认登出 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| playwright_hint | `await dlg.getByRole('button', { name: '确定' }).click(); await expect(page).toHaveURL(/\/admin\/login$/)` |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 同 TC-US02-13（文章 `tc-us02-14`）

**测试数据**：同 TC-US02-13

**步骤**
1. 输入未保存内容，点击"登出"
2. 在弹窗中点击"确定"（按钮文案以 design-ui 为准）

**预期结果**
- 跳转到 `{BASE}/admin/login`，会话 Cookie 被清除
- 不再出现浏览器原生 `beforeunload` 二次提示（`page.on('dialog')` 仅触发 0 或 1 次，以实现方式为准）

**清理**：重新登录删除测试文章；登出

---

### TC-US02-15: 无未保存修改时不弹窗，直接登出

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-15 |
| covers | SC-LOGOUT-03, SC-LOGOUT-01 |
| Scenario | 等价类：干净状态下点击登出 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| playwright_hint | `await page.getByRole('button', { name: '登出' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page).toHaveURL(/\/admin\/login$/)` |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】已登录；文章 `tc-us02-15`
- 【环境前置】打开编辑页，不做任何修改

**测试数据**：无

**步骤**
1. 点击"登出"

**预期结果**
- 不出现确认弹窗，直接跳转到 `/admin/login`

**清理**：重新登录删除测试文章；登出

---

### TC-US02-16: 保存完成后修改状态复位，不再弹窗

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-16 |
| covers | SC-LOGOUT-03 |
| Scenario | 边界：修改 → 保存完成 → 登出 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| playwright_hint | `await page.waitForResponse(r => r.url().includes('/api/admin/posts') && r.ok()); await page.getByRole('button', { name: '登出' }).click(); await expect(page.getByRole('dialog')).toHaveCount(0)` |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】已登录；文章 `tc-us02-16`

**测试数据**：追加内容 `已保存内容-tc-us02-16`

**步骤**
1. 修改正文，触发保存（手动保存或等待自动保存完成）
2. 保存响应成功后点击"登出"

**预期结果**
- 不出现确认弹窗，直接登出
- 重新登录后文章包含 `已保存内容-tc-us02-16`

**清理**：删除测试文章；登出

---

## NFR 安全测试

> 依据 [全局 NFR](../../../../../product/nfr.md) §2.1（登出即失效）、§2.2（CSRF）、§5（日志）。

### TC-US02-17: 登出过程不泄露 Token，清除 Cookie 属性正确

| 字段 | 值 |
|------|------|
| TC-ID | TC-US02-17 |
| covers | SC-LOGOUT-01 |
| Scenario | 登出相关的日志与 Cookie 安全 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅（需在测试环境用 `wrangler tail` 采集日志） |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】有效会话 `S`
- 【环境前置】开启日志采集

**测试数据**：`S`

**步骤**
1. 携带 `S` 登出；再用 `S` 调用保存接口（触发 401）
2. 停止采集，检查日志与响应

**预期结果**
- 日志中不出现 `S` 的值，也不出现管理员密码
- 清除 Cookie 的 `Set-Cookie` 仍带 `HttpOnly`、`Secure`、`SameSite=Lax`，`Path` 与签发时一致（否则浏览器不会覆盖原 Cookie）
- 401 响应体不包含会话细节（如"会话已登出"与"会话不存在"的内部区分可接受，但不得回显 Token）

**清理**：删除日志采集文件

---

## 覆盖矩阵

| SC-ID | Behavior | TC-IDs |
|-------|----------|--------|
| SC-LOGOUT-01 | BH-01 | TC-US02-01, TC-US02-02, TC-US02-10, TC-US02-11, TC-US02-12, TC-US02-15, TC-US02-17 |
| SC-LOGOUT-02 | BH-02 | TC-US02-03, TC-US02-04, TC-US02-05, TC-US02-06 |
| SC-LOGOUT-03 | BH-03 | TC-US02-13, TC-US02-14, TC-US02-15, TC-US02-16 |
| SC-LOGOUT-04 | BH-04 | TC-US02-07, TC-US02-08, TC-US02-09 |

**story.md 验收标准追溯**：AC1 → SC-LOGOUT-01；AC2（旧 Cookie 访问后台跳登录 / 写接口 401，服务端失效）→ SC-LOGOUT-02（TC-US02-03、04）。
**NFR 追溯**：会话登出即失效（§2.1）→ TC-US02-03～06；写接口 Origin 校验（§2.2）→ TC-US02-10、11；日志不记录 Token（§5）→ TC-US02-17。

**Gap 检查**：behaviors.md SC-ID 集合 {SC-LOGOUT-01, SC-LOGOUT-02, SC-LOGOUT-03, SC-LOGOUT-04}（4 个）与本文件 covers 集合差集为空。

**Gap: 无**

**覆盖率目标**：需求覆盖 100%，行为覆盖 100%（verify 阶段验收基线）。

---

## 待确认事项（不阻塞，进入 design-domain / design-ui 时确认）

1. 登出是仅使当前会话失效，还是使该管理员全部会话失效（TC-US02-06）。
2. 登出接口是否做 Origin 校验（TC-US02-10），与"无会话时幂等成功"的优先顺序。
3. 未保存确认使用自定义弹窗还是原生 `confirm()`，以及"确定"按钮文案（TC-US02-13/14）。
4. "未保存修改"的判定与自动保存的关系（自动保存进行中 / 失败时是否算未保存）。

---

## 执行记录

| 日期 | 执行人 | 结果 | 备注 |
|------|--------|------|------|
| — | — | ⏳ | 待 implement 后执行 |

**状态说明**: ✅ 通过 | ❌ 失败 | ⏳ 待执行 | ⏭️ 跳过

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-10 | v1.0 | 初始版本 | miraclehifi |
