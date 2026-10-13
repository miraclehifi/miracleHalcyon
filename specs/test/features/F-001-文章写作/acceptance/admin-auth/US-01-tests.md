# 管理员登录 验收测试

**US ID**: US-01
**所属分组**: admin-auth
**Story**: [story.md](../../../../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/story.md)
**Behaviors**: [behaviors.md](../../../../../product/features/F-001-文章写作/stories/admin-auth/US-01-admin-login/behaviors.md)
**最后更新**: 2026-10-10
**Version Tag**: v1.0
**状态**: draft

> 验收测试用例由 behaviors.md 的 Given-When-Then 生成，并按等价类、边界值、错误猜测、状态转换补充。
> 文中接口路径（`POST /api/admin/login` 等）均为占位，**接口路径以 design-domain API 契约为准**；状态码中未在 behaviors 明确的（如 400/403）同样以 API 契约为准。

---

## 测试用例列表

| TC ID | covers | 场景 | 类型 | Priority |
|-------|--------|------|------|----------|
| TC-US01-01 | SC-LOGIN-01 | 正确凭据调用登录接口，返回会话 Cookie | api | P0 |
| TC-US01-02 | SC-LOGIN-01 | 浏览器中正确凭据登录进入 /admin | e2e | P0 |
| TC-US01-03 | SC-LOGIN-02 | 未登录访问编辑页 → 登录 → 回到原页面 | e2e | P0 |
| TC-US01-04 | SC-LOGIN-02 | 未登录访问各类 /admin/** 页面均跳转登录（等价类） | e2e | P1 |
| TC-US01-05 | SC-LOGIN-03 | 已登录访问登录页直接进入 /admin | e2e | P1 |
| TC-US01-06 | SC-LOGIN-04 | 正确账号 + 错误密码登录失败 | api | P0 |
| TC-US01-07 | SC-LOGIN-04 | 错误账号 + 正确密码，响应与"密码错"不可区分 | security | P0 |
| TC-US01-08 | SC-LOGIN-04 | 账号字段 SQL 注入 / 特殊字符 | security | P1 |
| TC-US01-09 | SC-LOGIN-04 | 超长密码 / 超长账号不导致 5xx 或超时 | security | P1 |
| TC-US01-10 | SC-LOGIN-05 | 绕过前端直接提交空账号或空密码 | api | P1 |
| TC-US01-11 | SC-LOGIN-06 | 边界：连续失败 4 次后，第 5 次正确密码仍可登录 | api | P0 |
| TC-US01-12 | SC-LOGIN-06 | 边界：连续失败 5 次后，第 6 次正确密码返回 429 | api | P0 |
| TC-US01-13 | SC-LOGIN-06 | 锁定期内错误密码同样返回 429（不泄露密码对错） | security | P1 |
| TC-US01-14 | SC-LOGIN-06 | 限流按 IP 隔离：IP-A 锁定不影响 IP-B | api | P1 |
| TC-US01-15 | SC-LOGIN-06, SC-LOGIN-07 | "连续"语义：中间一次成功会清零计数 | api | P1 |
| TC-US01-16 | SC-LOGIN-06 | 伪造 X-Forwarded-For 等请求头无法绕过限流 | security | P1 |
| TC-US01-17 | SC-LOGIN-07 | 边界：锁定后 14:59 仍为 429 | api | P0 |
| TC-US01-18 | SC-LOGIN-07 | 边界：锁定后 15:01 登录成功且计数清零 | api | P0 |
| TC-US01-19 | SC-LOGIN-08 | 无 Cookie 调用全部写接口返回 401，数据不变 | security | P0 |
| TC-US01-20 | SC-LOGIN-08 | 伪造 / 篡改 Cookie 调用全部写接口返回 401 | security | P0 |
| TC-US01-21 | SC-LOGIN-08 | 对照组：有效会话调用写接口成功 | api | P0 |
| TC-US01-22 | SC-LOGIN-08 | 写接口 Origin 校验（CSRF）：缺失 / 外域 Origin 被拒 | security | P0 |
| TC-US01-23 | SC-LOGIN-01 | 登录接口 Origin 校验（Login CSRF） | security | P1 |
| TC-US01-24 | SC-LOGIN-09 | 边界：会话 6 天 23:59 时仍有效 | api | P1 |
| TC-US01-25 | SC-LOGIN-09, SC-LOGIN-08 | 边界：会话 7 天 + 1 分钟后页面跳登录、接口 401 | e2e | P0 |
| TC-US01-26 | SC-LOGIN-09, SC-LOGIN-01 | 会话状态转换：无 → 有效 → 过期 → 重新登录 | e2e | P1 |
| TC-US01-27 | SC-LOGIN-11 | next 参数开放重定向变体全部回落到 /admin | security | P0 |
| TC-US01-28 | SC-LOGIN-11, SC-LOGIN-03 | 已登录访问带恶意 next 的登录页仍到 /admin | security | P2 |
| TC-US01-29 | SC-LOGIN-05 | UI：账号或密码为空时"登录"按钮禁用 | ui-interaction | P0 |
| TC-US01-30 | SC-LOGIN-05 | UI：填写后启用、清空任一字段后再次禁用 | ui-interaction | P1 |
| TC-US01-31 | SC-LOGIN-10 | UI：提交中按钮禁用 + 加载指示，连击仅发一次请求 | ui-interaction | P0 |
| TC-US01-32 | SC-LOGIN-10 | UI：请求失败后加载态结束、按钮恢复 | ui-interaction | P2 |
| TC-US01-33 | SC-LOGIN-04 | UI：错误提示文案，密码清空、账号保留 | ui-interaction | P0 |
| TC-US01-34 | SC-LOGIN-06 | UI：锁定提示文案 | ui-interaction | P1 |
| TC-US01-35 | SC-LOGIN-01, SC-LOGIN-04 | NFR：密码与会话 Token 不出现在日志 / 响应 | security | P0 |
| TC-US01-36 | SC-LOGIN-01 | NFR：会话 Cookie 属性与 Token 强度 | security | P0 |
| TC-US01-37 | SC-LOGIN-01 | NFR：密码以不可逆哈希存储 | security | P0 |
| TC-US01-38 | SC-LOGIN-01 | NFR：防会话固定（登录后签发新 Token） | security | P1 |
| TC-US01-39 | SC-LOGIN-01 | NFR：登录接口响应时间 | performance | P2 |

---

## 测试数据策略

| 数据 | 策略 | 说明 |
|------|------|------|
| 管理员凭据 | **共享只读 Fixture** `admin-credentials` | 账号 `test-admin`、密码 `Test-Passw0rd!`；由测试环境 Secrets（如 `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`）注入其哈希，测试代码从测试环境变量 `TEST_ADMIN_PASSWORD` 读取明文。**禁止使用生产凭据**；任何用例不得修改该 Fixture |
| 已登录会话 | **Factory** `createSession({ ageDays? })` | 每个用例通过登录接口按需获取新会话；需"已存在 N 天"的会话时，用测试专用手段回拨 D1 会话记录的创建 / 过期时间（或 Fake Clock） |
| 文章 / 图片 | **Factory** `createPost()`、**Seed** 测试 D1 | 写接口用例前先通过有效会话创建一篇测试文章（slug 前缀 `tc-us01-`），用于保存 / 发布 / 删除；清理阶段按前缀删除 |
| 图片上传文件 | **Fixture** `fixtures/test-image.png`（1×1 PNG，< 1KB） | 只读 |
| 限流计数 | **每用例 IP 隔离** | 每个限流用例使用唯一 `CF-Connecting-IP`（如 `198.51.100.{用例序号}`，RFC 5737 文档保留段），或用例开始前调用测试环境专用的计数重置手段清空该 IP 计数；禁止多个用例共享同一 IP |
| 时间 | **Fake Clock / 时间回拨** | 锁定 15 分钟、会话 7 天的边界通过可控时钟或回拨存储中的时间戳实现，不真实等待 |

**独立性**：每个用例自行建立会话与数据，不依赖执行顺序；清理后系统回到"无会话、计数为 0、无 `tc-us01-` 前缀数据"的已知状态。

**环境约定**：测试环境部署地址记为 `{BASE}`（HTTPS）；合法 Origin 即 `{BASE}` 的 origin。

---

## 功能验收测试

### TC-US01-01: 正确凭据调用登录接口，返回会话 Cookie

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-01 |
| covers | SC-LOGIN-01 |
| Scenario | 正确账号密码登录成功 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】`admin-credentials` Fixture 已注入；测试 IP 失败计数为 0
- 【环境前置】测试环境可通过 HTTPS 访问

**测试数据**：`username=test-admin`，`password=Test-Passw0rd!`，`Origin: {BASE}`，`CF-Connecting-IP: 198.51.100.1`

**步骤**
1. `POST /api/admin/login`，携带上述数据

**预期结果**
- 返回成功（2xx，或 302/303 指向 `/admin`，以 API 契约为准）
- 响应含 `Set-Cookie`，会话 Cookie 带 `HttpOnly`、`Secure`、`SameSite=Lax`
- Cookie 有效期为 7 天（`Max-Age=604800` 或等价 `Expires`）
- 响应体不包含密码

**清理**：调用登出接口使会话失效

---

### TC-US01-02: 浏览器中正确凭据登录进入 /admin

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-02 |
| covers | SC-LOGIN-01 |
| Scenario | 登录页输入正确凭据，点击"登录"后进入文章列表页 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】同 TC-US01-01
- 【环境前置】全新浏览器上下文（无 Cookie）

**测试数据**：同 TC-US01-01

**步骤**
1. 打开 `{BASE}/admin/login`
2. 账号输入 `test-admin`，密码输入 `Test-Passw0rd!`
3. 点击"登录"

**预期结果**
- URL 变为 `{BASE}/admin`，显示文章列表页
- 浏览器上下文中存在会话 Cookie，属性 `httpOnly=true`、`secure=true`、`sameSite=Lax`

**清理**：清空浏览器上下文；登出使服务端会话失效

---

### TC-US01-03: 未登录访问编辑页 → 登录 → 回到原页面

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-03 |
| covers | SC-LOGIN-02 |
| Scenario | 未登录访问后台页面跳转登录，登录后回到原页面 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】通过 Factory 预建一篇文章，其 ID 记为 `abc`（实际 ID 以 Factory 返回为准）
- 【环境前置】全新浏览器上下文

**测试数据**：目标路径 `/admin/posts/abc/edit`；凭据同上

**步骤**
1. 访问 `{BASE}/admin/posts/abc/edit`
2. 在登录页输入正确凭据并点击"登录"

**预期结果**
- 步骤 1 后 URL 为 `{BASE}/admin/login?next=/admin/posts/abc/edit`（`next` 值允许被 URL 编码，解码后相等）
- 步骤 2 后 URL 为 `{BASE}/admin/posts/abc/edit`，编辑页正常展示

**清理**：删除测试文章；登出

---

### TC-US01-04: 未登录访问各类 /admin/** 页面均跳转登录（等价类）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-04 |
| covers | SC-LOGIN-02 |
| Scenario | 后台任意页面在未登录时都被拦截 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】无 Cookie 的 HTTP 客户端（不自动跟随重定向）

**测试数据**（参数化）

| 路径 | 期望 Location |
|------|---------------|
| `/admin` | `/admin/login?next=/admin` |
| `/admin/` | `/admin/login?next=/admin/`（或规范化为 `/admin`） |
| `/admin/posts/new` | `/admin/login?next=/admin/posts/new` |
| `/admin/posts/abc/edit?tab=meta` | `next` 保留 query：`/admin/posts/abc/edit?tab=meta`（编码后） |
| `/admin/not-exist-page` | `/admin/login?next=/admin/not-exist-page`（先鉴权后 404，不泄露路由） |

**步骤**
1. 对每个路径发起 `GET`

**预期结果**
- 均返回 302/303，`Location` 如上表；响应体不包含任何后台数据
- `/admin/login` 本身不被重定向（返回 200，避免循环）

**清理**：无

---

### TC-US01-05: 已登录访问登录页直接进入 /admin

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-05 |
| covers | SC-LOGIN-03 |
| Scenario | 已登录且会话有效时访问 /admin/login |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】通过 Factory 获取有效会话（创建于 1 分钟前）
- 【环境前置】浏览器上下文已带该会话 Cookie

**测试数据**：无额外数据

**步骤**
1. 访问 `{BASE}/admin/login`

**预期结果**
- 被跳转到 `{BASE}/admin`，不显示登录表单
- 会话 Cookie 值未改变（未重新签发）

**清理**：登出

---

### TC-US01-06: 正确账号 + 错误密码登录失败

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-06 |
| covers | SC-LOGIN-04 |
| Scenario | 密码错误时登录失败且不发会话 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】测试 IP 计数为 0
- 【环境前置】`CF-Connecting-IP: 198.51.100.6`

**测试数据**（等价类，参数化）

| 用例 | password |
|------|----------|
| 完全错误 | `Wrong-Passw0rd!` |
| 差一位 | `Test-Passw0rd` |
| 大小写不同 | `test-passw0rd!` |
| 前后空格 | ` Test-Passw0rd! ` |

**步骤**
1. 每组数据分别 `POST /api/admin/login`（`username=test-admin`），每组前重置该 IP 计数

**预期结果**
- 返回 401（以 API 契约为准），错误信息为"账号或密码错误"
- 响应中**无**会话 `Set-Cookie`

**清理**：重置该 IP 失败计数

---

### TC-US01-07: 错误账号 + 正确密码，响应与"密码错"不可区分

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-07 |
| covers | SC-LOGIN-04 |
| Scenario | 不区分账号错与密码错，防账号枚举 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】`CF-Connecting-IP: 198.51.100.7`，计数为 0

**测试数据**
- A：`username=not-admin`，`password=Test-Passw0rd!`
- B：`username=test-admin`，`password=Wrong-Passw0rd!`
- C：`username=TEST-ADMIN`，`password=Test-Passw0rd!`

**步骤**
1. 分别提交 A、B、C（每次前重置计数）
2. 各重复 20 次，记录响应时间

**预期结果**
- A、B、C 的状态码、响应体、响应头（除 Date 等易变头外）完全一致，提示均为"账号或密码错误"
- A 与 B 的响应时间中位数差 < 50ms（账号不存在时也执行哈希比对，避免时序侧信道）
- 均无会话 Cookie

**清理**：重置计数

---

### TC-US01-08: 账号字段 SQL 注入 / 特殊字符

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-08 |
| covers | SC-LOGIN-04 |
| Scenario | 恶意输入按普通错误凭据处理 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】每组使用独立 IP `198.51.100.8x`

**测试数据**（username；password 统一 `x`）
- `' OR '1'='1' --`
- `test-admin'--`
- `admin" OR 1=1 #`
- `<script>alert(1)</script>`
- `test-admin\u0000`
- `{"$ne": null}`（以 JSON 对象而非字符串提交）

**步骤**
1. 逐组 `POST /api/admin/login`

**预期结果**
- 均返回 401"账号或密码错误"或 400（类型非法时），**无** 5xx、无数据库错误信息、无堆栈
- 均无会话 Cookie
- 若错误信息回显输入，必须已转义（不执行脚本）

**清理**：重置各 IP 计数

---

### TC-US01-09: 超长密码 / 超长账号不导致 5xx 或超时

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-09 |
| covers | SC-LOGIN-04 |
| Scenario | 超长输入（哈希计算 DoS 防护） |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】独立 IP `198.51.100.9`

**测试数据**
- 密码 1,000 字符（`a` × 1000）
- 密码 100,000 字符
- 请求体约 1MB（密码 `a` × 1,048,576）
- 账号 10,000 字符

**步骤**
1. 逐组提交

**预期结果**
- 返回 401 或 400 / 413（以 API 契约为准），无 5xx
- 每次响应时间 < 2s（不因超长输入导致 Worker CPU 超限）
- 均无会话 Cookie

**清理**：重置计数

---

### TC-US01-10: 绕过前端直接提交空账号或空密码

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-10 |
| covers | SC-LOGIN-05 |
| Scenario | 服务端同样拒绝空字段 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】独立 IP `198.51.100.10`

**测试数据**（参数化）：`username=""`；`password=""`；两者皆空；缺少 `password` 字段；`password=null`

**步骤**
1. 逐组 `POST /api/admin/login`

**预期结果**
- 返回 400 或 401（以 API 契约为准），无 5xx
- 无会话 Cookie

**清理**：重置计数

---

### TC-US01-11: 边界——连续失败 4 次后，第 5 次正确密码仍可登录

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-11 |
| covers | SC-LOGIN-06 |
| Scenario | 锁定阈值下边界（4 次失败未锁定） |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】独立 IP `198.51.100.11`，计数为 0

**测试数据**：错误密码 `Wrong-Passw0rd!`；正确密码 `Test-Passw0rd!`

**步骤**
1. 用错误密码登录 4 次
2. 第 5 次用正确密码登录

**预期结果**
- 步骤 1 每次返回 401（非 429）
- 步骤 2 登录成功并获得会话 Cookie

**清理**：登出；重置计数

---

### TC-US01-12: 边界——连续失败 5 次后，第 6 次正确密码返回 429

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-12 |
| covers | SC-LOGIN-06 |
| Scenario | 达到阈值后锁定，即使密码正确 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】独立 IP `198.51.100.12`，计数为 0

**测试数据**：同 TC-US01-11

**步骤**
1. 用错误密码登录 5 次
2. 立即用正确密码登录

**预期结果**
- 步骤 1 第 1～5 次返回 401
- 步骤 2 返回 **429**，提示"尝试次数过多，请 15 分钟后再试"
- 无会话 Cookie
- （建议）响应含 `Retry-After` 头，值 ≤ 900

> 注：story.md 验收标准写作"尝试次数过多，请稍后再试"，behaviors.md 写作"尝试次数过多，请 15 分钟后再试"；本用例以 behaviors.md 为准，需在 design-ui 统一文案。

**清理**：重置计数

---

### TC-US01-13: 锁定期内错误密码同样返回 429

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-13 |
| covers | SC-LOGIN-06 |
| Scenario | 锁定期间不对密码做比对结论回显，防止锁定期内继续爆破 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】IP `198.51.100.13` 已连续失败 5 次（处于锁定）

**测试数据**：错误密码 `Wrong-Passw0rd!`、正确密码 `Test-Passw0rd!`、不存在账号 `not-admin`

**步骤**
1. 依次用三组凭据登录

**预期结果**
- 三次均返回 429，响应体一致，均无会话 Cookie

**清理**：重置计数

---

### TC-US01-14: 限流按 IP 隔离

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-14 |
| covers | SC-LOGIN-06 |
| Scenario | IP-A 锁定不影响 IP-B |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】IP-A `198.51.100.141`、IP-B `198.51.100.142`，计数均为 0

**测试数据**：同 TC-US01-11

**步骤**
1. IP-A 错误密码登录 5 次
2. IP-B 正确密码登录
3. IP-A 正确密码登录

**预期结果**
- 步骤 2 登录成功
- 步骤 3 返回 429

**清理**：登出 IP-B 会话；重置两个 IP 计数

---

### TC-US01-15: "连续"语义——中间一次成功会清零计数

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-15 |
| covers | SC-LOGIN-06, SC-LOGIN-07 |
| Scenario | 登录成功清零失败计数 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】独立 IP `198.51.100.15`，计数为 0

**步骤**
1. 错误密码 4 次 → 正确密码 1 次（成功）→ 登出
2. 错误密码 4 次
3. 正确密码登录

**测试数据**：同 TC-US01-11

**预期结果**
- 步骤 2 每次均为 401（累计非连续失败 8 次但未锁定）
- 步骤 3 登录成功

**清理**：登出；重置计数

---

### TC-US01-16: 伪造请求头无法绕过限流

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-16 |
| covers | SC-LOGIN-06 |
| Scenario | 客户端 IP 只取自 Cloudflare 可信来源 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ❌（需经真实 Cloudflare 边缘发起请求，`CF-Connecting-IP` 由边缘覆写；本地 / 直连环境无法真实验证，建议在预发环境手工执行） |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】预发环境，经 Cloudflare 边缘访问，测试机出口 IP 计数为 0

**测试数据**：每次请求随机设置 `X-Forwarded-For: 203.0.113.{随机}`、`X-Real-IP: 203.0.113.{随机}`，并尝试自带 `CF-Connecting-IP: 203.0.113.{随机}`

**步骤**
1. 错误密码登录 5 次（每次更换上述伪造头）
2. 正确密码登录

**预期结果**
- 步骤 2 返回 429（计数按真实出口 IP 累计）

**清理**：重置出口 IP 计数

---

### TC-US01-17: 边界——锁定后 14:59 仍为 429

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-17 |
| covers | SC-LOGIN-07 |
| Scenario | 锁定期上边界内 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】IP `198.51.100.17` 已连续失败 5 次，最后一次失败时刻记为 T0
- 【环境前置】可控时钟或可回拨计数记录时间戳

**测试数据**：正确密码 `Test-Passw0rd!`

**步骤**
1. 将时间推进到 T0 + 14 分 59 秒
2. 用正确密码登录

**预期结果**
- 返回 429，提示"尝试次数过多，请 15 分钟后再试"，无会话 Cookie

**清理**：恢复时钟；重置计数

---

### TC-US01-18: 边界——锁定后 15:01 登录成功且计数清零

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-18 |
| covers | SC-LOGIN-07 |
| Scenario | 锁定期满后可再次登录，失败计数清零 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】同 TC-US01-17（IP `198.51.100.18`）
- 【环境前置】同 TC-US01-17

**测试数据**：正确密码 `Test-Passw0rd!`、错误密码 `Wrong-Passw0rd!`

**步骤**
1. 将时间推进到 T0 + 15 分 01 秒
2. 用正确密码登录 → 登出
3. 用错误密码登录 1 次，再用正确密码登录

**预期结果**
- 步骤 2 登录成功，获得会话 Cookie
- 步骤 3 错误密码返回 401（非 429），随后正确密码登录成功（证明计数已清零而非沿用 5 次）

**清理**：登出；恢复时钟；重置计数

---

### TC-US01-19: 无 Cookie 调用全部写接口返回 401，数据不变

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-19 |
| covers | SC-LOGIN-08 |
| Scenario | 未认证用户调用任一写接口 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】通过有效会话预建文章 `tc-us01-19`（草稿），记录其 D1 行快照；记录 R2 对象数量
- 【环境前置】请求均带合法 `Origin: {BASE}`，**不带** Cookie

**测试数据**（权限矩阵——写接口类别，路径为占位）

| 类别 | 请求 |
|------|------|
| 创建文章 | `POST /api/admin/posts`，`{"title":"tc-us01-19-new","content":"x"}` |
| 保存文章 | `PUT /api/admin/posts/{id}`，`{"title":"changed"}` |
| 发布文章 | `POST /api/admin/posts/{id}/publish` |
| 删除文章 | `DELETE /api/admin/posts/{id}` |
| 上传图片 | `POST /api/admin/images`（multipart，`fixtures/test-image.png`） |

**步骤**
1. 逐个调用上表接口

**预期结果**
- 全部返回 **401**，响应体不含文章数据
- D1：无 `tc-us01-19-new` 记录；`tc-us01-19` 行与快照完全一致（标题、内容、状态、更新时间）
- R2：对象数量不变

**清理**：用有效会话删除 `tc-us01-19`；登出

---

### TC-US01-20: 伪造 / 篡改 Cookie 调用全部写接口返回 401

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-20 |
| covers | SC-LOGIN-08 |
| Scenario | 伪造会话不能通过鉴权 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】同 TC-US01-19（文章 `tc-us01-20`）；另获取一个有效会话值 `S`
- 【环境前置】合法 Origin

**测试数据**（Cookie 变体 × TC-US01-19 中 5 类写接口）

| 变体 | 会话 Cookie 值 |
|------|----------------|
| 随机值 | 与 `S` 等长的随机字符串 |
| 篡改末位 | `S` 最后一个字符替换 |
| 截断 | `S` 去掉后半段 |
| 空值 | 空字符串 |
| 错误 Cookie 名 | 正确值 `S` 但放在其他 Cookie 名下 |
| 注入 | `' OR '1'='1` |

**步骤**
1. 对每个变体 × 每类写接口发起请求

**预期结果**
- 全部返回 401，无 5xx
- D1 / R2 数据与快照一致

**清理**：删除测试文章；登出 `S`

---

### TC-US01-21: 对照组——有效会话调用写接口成功

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-21 |
| covers | SC-LOGIN-08 |
| Scenario | 已认证用户可执行全部写操作（权限矩阵正向） |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】有效会话 `S`
- 【环境前置】合法 Origin

**测试数据**：同 TC-US01-19 接口表，标题 `tc-us01-21`

**步骤**
1. 创建 → 保存 → 发布 → 上传图片 → 删除

**预期结果**
- 每步返回 2xx（具体码以 API 契约为准），D1 / R2 产生对应变化

**清理**：确认文章已删除；删除上传的 R2 对象；登出

---

### TC-US01-22: 写接口 Origin 校验（CSRF）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-22 |
| covers | SC-LOGIN-08 |
| Scenario | 带有效会话但来源非本站的写请求被拒绝 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】有效会话 `S`；文章 `tc-us01-22` 快照

**测试数据**（Origin 变体 × 5 类写接口）：缺失 `Origin`；`Origin: https://evil.example.com`；`Origin: null`；`Origin: http://{BASE 主机名}`（协议降级）；`Origin: https://{BASE 主机名}.evil.example.com`

**步骤**
1. 对每个变体 × 每类写接口携带 `S` 发起请求

**预期结果**
- 全部被拒绝（403，以 API 契约为准），D1 / R2 无变化
- 对照：`Origin: {BASE}` 的同样请求成功（见 TC-US01-21）

**清理**：删除测试文章；登出

---

### TC-US01-23: 登录接口 Origin 校验（Login CSRF）

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-23 |
| covers | SC-LOGIN-01 |
| Scenario | 外站不能替用户发起登录 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】独立 IP `198.51.100.23`

**测试数据**：正确凭据；Origin 变体：缺失、`https://evil.example.com`、`null`

**步骤**
1. 逐个变体 `POST /api/admin/login`

**预期结果**
- 均被拒绝（403，以 API 契约为准），无会话 Cookie
- 被拒请求不计入失败计数（随后正确登录仍成功）——若设计决定计入，以 design-domain 为准并更新本用例

**清理**：登出；重置计数

---

### TC-US01-24: 边界——会话 6 天 23:59 时仍有效

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-24 |
| covers | SC-LOGIN-09 |
| Scenario | 有效期下边界内 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | api |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】Factory `createSession({ ageDays: 6d23h59m })`（回拨会话创建 / 过期时间）

**测试数据**：无额外数据

**步骤**
1. 携带该会话 `GET /admin`
2. 携带该会话调用保存文章接口（文章由 Factory 预建）

**预期结果**
- 步骤 1 返回 200，显示后台
- 步骤 2 返回 2xx

> 注：会话为"登录起固定 7 天"或"滑动续期"未在 behaviors 中定义，本用例与 TC-US01-25 按固定 7 天设计，以 design-domain 为准。

**清理**：删除测试文章；登出

---

### TC-US01-25: 边界——会话 7 天 + 1 分钟后过期

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-25 |
| covers | SC-LOGIN-09, SC-LOGIN-08 |
| Scenario | 会话过期后访问后台需重新登录，写接口 401 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】Factory `createSession({ ageDays: 7d0h1m })`；浏览器上下文注入该 Cookie（模拟浏览器仍保留 Cookie 而服务端已过期）

**测试数据**：无额外数据

**步骤**
1. 访问 `{BASE}/admin`
2. 携带该 Cookie 调用保存文章接口

**预期结果**
- 步骤 1 跳转到 `{BASE}/admin/login`（可带 `?next=/admin`）
- 步骤 2 返回 401，数据不变

**清理**：删除服务端过期会话记录；清空浏览器上下文

---

### TC-US01-26: 会话状态转换

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-26 |
| covers | SC-LOGIN-09, SC-LOGIN-01 |
| Scenario | 无会话 → 有效 → 过期 → 重新登录有效 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | e2e |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】全新浏览器上下文；可控时钟

**测试数据**：正确凭据

**步骤与预期**

| 步骤 | 状态 | 操作 | 预期 |
|------|------|------|------|
| 1 | 无会话 | 访问 `/admin` | 跳登录页 |
| 2 | 无 → 有效 | 正确凭据登录 | 进入 `/admin`，获得 Cookie `S1` |
| 3 | 有效 | 访问 `/admin/login` | 跳回 `/admin` |
| 4 | 有效 → 过期 | 时钟推进 7 天 + 1 分钟后访问 `/admin` | 跳登录页 |
| 5 | 过期 → 有效 | 再次登录 | 进入 `/admin`，获得 `S2 ≠ S1`；用 `S1` 调写接口仍为 401 |

**清理**：登出；恢复时钟

---

### TC-US01-27: next 参数开放重定向变体全部回落到 /admin

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-27 |
| covers | SC-LOGIN-11 |
| Scenario | 登录跳转参数不允许跳到站外 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】每组使用全新上下文；独立 IP `198.51.100.27`

**测试数据**（`next` 原始值，参数化，请求时做 URL 编码）

| # | next | 预期最终 URL |
|---|------|-------------|
| 1 | `https://evil.example.com` | `{BASE}/admin` |
| 2 | `http://evil.example.com/admin` | `{BASE}/admin` |
| 3 | `//evil.example.com` | `{BASE}/admin` |
| 4 | `/\evil.example.com` | `{BASE}/admin` |
| 5 | `\\evil.example.com` | `{BASE}/admin` |
| 6 | `/%2F%2Fevil.example.com`（双重编码） | `{BASE}/admin` |
| 7 | `javascript:alert(1)` | `{BASE}/admin`，且无脚本执行 |
| 8 | `JaVaScRiPt:alert(1)` | `{BASE}/admin` |
| 9 | `data:text/html,<script>alert(1)</script>` | `{BASE}/admin` |
| 10 | `https:evil.example.com` | `{BASE}/admin` |
| 11 | `/\t/evil.example.com`（含制表符） | `{BASE}/admin` |
| 12 | `https://{BASE 主机名}.evil.example.com` | `{BASE}/admin` |
| 13 | `/posts/hello`（站内非后台路径） | 停留在 `{BASE}` 域内（`/posts/hello` 或 `/admin`，以 design-domain 为准） |
| 14 | `/admin/posts/abc/edit`（对照组） | `{BASE}/admin/posts/abc/edit` |

**步骤**
1. 访问 `{BASE}/admin/login?next={编码后的 next}`
2. 正确凭据登录

**预期结果**
- 最终 URL 如上表；1～12 的响应 `Location` 头不指向任何外部主机
- 登录本身成功（会话 Cookie 已设置）
- 浏览器未触发任何 dialog（用 `page.on('dialog')` 断言为 0 次）

**清理**：每组登出

---

### TC-US01-28: 已登录访问带恶意 next 的登录页仍到 /admin

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-28 |
| covers | SC-LOGIN-11, SC-LOGIN-03 |
| Scenario | "已登录直接跳转"分支同样过滤 next |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】有效会话

**测试数据**：`next` 取 TC-US01-27 第 1、3、4、7 组

**步骤**
1. 携带会话访问 `{BASE}/admin/login?next={值}`

**预期结果**
- 均跳转到 `{BASE}/admin`，`Location` 不指向外部主机

**清理**：登出

---

## UI 交互测试

### TC-US01-29: 账号或密码为空时"登录"按钮禁用

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-29 |
| covers | SC-LOGIN-05 |
| Scenario | 账号或密码为空时无法提交 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| playwright_hint | `await expect(page.getByRole('button', { name: '登录' })).toBeDisabled()` |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】打开 `{BASE}/admin/login`，无会话

**测试数据**（决策表）

| 账号 | 密码 | 按钮 |
|------|------|------|
| 空 | 空 | 禁用 |
| `test-admin` | 空 | 禁用 |
| 空 | `Test-Passw0rd!` | 禁用 |
| `test-admin` | `Test-Passw0rd!` | 可用 |

**步骤**
1. 按每行填写输入框（`page.getByLabel('账号')`、`page.getByLabel('密码')`，标签以 design-ui 为准）
2. 检查"登录"按钮状态；禁用时尝试在密码框按 Enter

**预期结果**
- 按钮状态如上表
- 禁用状态下按 Enter 不发出登录请求（`page.waitForRequest` 超时）

**清理**：无

---

### TC-US01-30: 填写后启用、清空任一字段后再次禁用

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-30 |
| covers | SC-LOGIN-05 |
| Scenario | 按钮状态随输入实时变化 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| playwright_hint | `await page.getByLabel('密码').fill(''); await expect(page.getByRole('button', { name: '登录' })).toBeDisabled()` |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】打开登录页

**测试数据**：`test-admin` / `Test-Passw0rd!`

**步骤**
1. 填写账号和密码 → 检查按钮
2. 清空密码 → 检查按钮
3. 重新填写密码、清空账号 → 检查按钮

**预期结果**
- 步骤 1 可用；步骤 2、3 禁用

**清理**：无

---

### TC-US01-31: 提交中按钮禁用 + 加载指示，连击仅发一次请求

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-31 |
| covers | SC-LOGIN-10 |
| Scenario | 提交中按钮禁用并显示加载态 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| playwright_hint | `await page.route('**/api/admin/login', async r => { await new Promise(f => setTimeout(f, 2000)); await r.continue(); }); await btn.click(); await expect(btn).toBeDisabled(); await expect(btn).toHaveAttribute('aria-busy', 'true')` |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】登录页；用 `page.route` 将登录请求延迟 2s

**测试数据**：`test-admin` / `Test-Passw0rd!`

**步骤**
1. 填写凭据，点击"登录"
2. 请求返回前再连续点击 3 次并按 Enter 1 次

**预期结果**
- 步骤 1 后按钮立即禁用并显示加载指示（加载元素可见或 `aria-busy="true"`，具体形式以 design-ui 为准）
- 整个过程登录请求仅发出 **1** 次
- 请求返回后跳转 `/admin`

**清理**：登出

---

### TC-US01-32: 请求失败后加载态结束、按钮恢复

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-32 |
| covers | SC-LOGIN-10 |
| Scenario | 错误猜测：网络异常 / 5xx 后不应卡在加载态 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| playwright_hint | `await page.route('**/api/admin/login', r => r.abort()); await btn.click(); await expect(btn).toBeEnabled()` |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】登录页；`page.route` 分别模拟 `abort()` 与返回 500

**测试数据**：`test-admin` / `Test-Passw0rd!`

**步骤**
1. 填写凭据并点击"登录"

**预期结果**
- 加载指示消失，按钮恢复可用，页面显示错误提示（文案以 design-ui 为准）
- 不跳转，未设置会话 Cookie

**清理**：无

---

### TC-US01-33: 错误提示文案，密码清空、账号保留

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-33 |
| covers | SC-LOGIN-04 |
| Scenario | 账号或密码错误时登录失败（UI 表现） |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| playwright_hint | `await expect(page.getByRole('alert')).toHaveText('账号或密码错误'); await expect(page.getByLabel('密码')).toHaveValue(''); await expect(page.getByLabel('账号')).toHaveValue('test-admin')` |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】登录页；独立 IP（或计数已重置）

**测试数据**：`test-admin` / `Wrong-Passw0rd!`

**步骤**
1. 填写并点击"登录"

**预期结果**
- 表单上方显示"账号或密码错误"
- 密码框为空，账号框保留 `test-admin`
- 停留在 `/admin/login`，无会话 Cookie
- 因密码已清空，"登录"按钮回到禁用状态

**清理**：重置计数

---

### TC-US01-34: 锁定提示文案

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-34 |
| covers | SC-LOGIN-06 |
| Scenario | 锁定时页面提示 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | ui-interaction |
| playwright_hint | `await expect(page.getByRole('alert')).toHaveText('尝试次数过多，请 15 分钟后再试')` |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【数据前置】当前浏览器出口 IP 已连续失败 5 次（通过 API 预置）

**测试数据**：`test-admin` / `Test-Passw0rd!`

**步骤**
1. 在登录页填写正确凭据并点击"登录"

**预期结果**
- 显示"尝试次数过多，请 15 分钟后再试"，不显示"账号或密码错误"
- 停留在登录页，无会话 Cookie

**清理**：重置计数

---

## NFR 安全 / 性能测试

> 依据 [全局 NFR](../../../../../product/nfr.md) §1、§2、§5。

### TC-US01-35: 密码与会话 Token 不出现在日志 / 响应

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-35 |
| covers | SC-LOGIN-01, SC-LOGIN-04 |
| Scenario | 日志与响应不泄露敏感信息 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅（需在测试环境用 `wrangler tail` 采集日志） |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】开启测试环境日志采集（`wrangler tail --format json` 输出到文件）

**测试数据**：成功登录 `Test-Passw0rd!`；失败登录 `Wrong-Passw0rd!`；超长密码（TC-US01-09 数据）

**步骤**
1. 依次执行成功登录、失败登录、超长密码登录、携带会话访问 `/admin`
2. 停止日志采集，在日志与所有响应（体 + 头）中搜索

**预期结果**
- 日志中不出现 `Test-Passw0rd!`、`Wrong-Passw0rd!`、超长密码片段、会话 Token 值
- 响应体 / 响应头中不出现密码；会话 Token 仅出现在 `Set-Cookie`，不出现在响应体或 URL
- 错误响应不包含堆栈、SQL 或哈希值

**清理**：删除日志采集文件；登出

---

### TC-US01-36: 会话 Cookie 属性与 Token 强度

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-36 |
| covers | SC-LOGIN-01 |
| Scenario | 会话 Cookie 安全属性 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】HTTPS 测试环境

**测试数据**：正确凭据，登录 20 次（每次登出）收集 Token

**步骤**
1. 解析每次登录的 `Set-Cookie`
2. 在页面中执行 `document.cookie`

**预期结果**
- 含 `HttpOnly`、`Secure`、`SameSite=Lax`、`Path=/`（或限定 `/`），无 `Domain` 放宽到父域
- `Max-Age=604800` 或等价 `Expires`
- `document.cookie` 不包含会话 Cookie
- 20 个 Token 互不相同，长度 ≥ 32 字符（≥128 bit 随机性），不含账号等可推测信息
- 通过 HTTP（非 HTTPS）访问被重定向到 HTTPS

**清理**：登出

---

### TC-US01-37: 密码以不可逆哈希存储

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-37 |
| covers | SC-LOGIN-01 |
| Scenario | 凭据不以明文存在于配置、代码或数据库 |
| Priority | P0 |
| Version Tag | v1.0 |
| Automation Feasibility | ❌（需人工检查 Secrets 配置与仓库，部分可用 grep 辅助） |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】可访问仓库与测试环境 Secrets 列表

**测试数据**：明文 `Test-Passw0rd!`

**步骤**
1. 在仓库全部文件与 git 历史中搜索 `Test-Passw0rd!` 及 Secret 名对应的值
2. 检查 `wrangler.toml` / `vars` 中不含密码或哈希
3. 检查 D1 所有表不含密码字段明文
4. 检查密码哈希 Secret 的格式

**预期结果**
- 仓库与 git 历史无明文密码（测试配置文件除外，且仅限测试环境变量引用）
- 凭据仅通过 Cloudflare Secrets 注入
- 哈希为 PBKDF2 / scrypt 等加盐慢哈希格式（含算法、迭代次数 / 成本参数、盐），非 MD5/SHA-1/无盐 SHA-256
- 比对实现使用常量时间比较

**清理**：无

---

### TC-US01-38: 防会话固定

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-38 |
| covers | SC-LOGIN-01 |
| Scenario | 登录前预置的 Cookie 不会被提升为有效会话 |
| Priority | P1 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | security |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】浏览器上下文预置会话 Cookie 值 `attacker-fixed-0001`

**测试数据**：正确凭据

**步骤**
1. 正确凭据登录
2. 用 `attacker-fixed-0001` 调用保存文章接口

**预期结果**
- 登录响应签发新 Token，且 ≠ `attacker-fixed-0001`
- 步骤 2 返回 401

**清理**：登出

---

### TC-US01-39: 登录接口响应时间

| 字段 | 值 |
|------|------|
| TC-ID | TC-US01-39 |
| covers | SC-LOGIN-01 |
| Scenario | 登录在可接受时间内完成 |
| Priority | P2 |
| Version Tag | v1.0 |
| Automation Feasibility | ✅ |
| type | performance |
| Change History | 2026-10-10 v1.0 初始创建 |

**前置条件**
- 【环境前置】预发环境（经 Cloudflare 边缘）

**测试数据**：正确凭据，串行 50 次（每次使用不同测试 IP 或成功后登出）

**步骤**
1. 记录每次 `POST /api/admin/login` 的耗时

**预期结果**
- P95 < 500ms（参照 NFR"写作接口 P95 < 500ms"）
- 无因哈希计算超出 Workers CPU 限制导致的失败

**清理**：登出所有会话

---

## 覆盖矩阵

| SC-ID | Behavior | TC-IDs |
|-------|----------|--------|
| SC-LOGIN-01 | BH-01 | TC-US01-01, TC-US01-02, TC-US01-23, TC-US01-26, TC-US01-35, TC-US01-36, TC-US01-37, TC-US01-38, TC-US01-39 |
| SC-LOGIN-02 | BH-02 | TC-US01-03, TC-US01-04 |
| SC-LOGIN-03 | BH-03 | TC-US01-05, TC-US01-28 |
| SC-LOGIN-04 | BH-04 | TC-US01-06, TC-US01-07, TC-US01-08, TC-US01-09, TC-US01-33, TC-US01-35 |
| SC-LOGIN-05 | BH-05 | TC-US01-10, TC-US01-29, TC-US01-30 |
| SC-LOGIN-06 | BH-06 | TC-US01-11, TC-US01-12, TC-US01-13, TC-US01-14, TC-US01-15, TC-US01-16, TC-US01-34 |
| SC-LOGIN-07 | BH-07 | TC-US01-15, TC-US01-17, TC-US01-18 |
| SC-LOGIN-08 | BH-08 | TC-US01-19, TC-US01-20, TC-US01-21, TC-US01-22, TC-US01-25 |
| SC-LOGIN-09 | BH-09 | TC-US01-24, TC-US01-25, TC-US01-26 |
| SC-LOGIN-10 | BH-10 | TC-US01-31, TC-US01-32 |
| SC-LOGIN-11 | BH-11 | TC-US01-27, TC-US01-28 |

**story.md 验收标准追溯**：AC1 → SC-LOGIN-02；AC2 → SC-LOGIN-01；AC3 → SC-LOGIN-04；AC4 → SC-LOGIN-06；AC5 → SC-LOGIN-08；AC6 → SC-LOGIN-03。
**NFR 追溯**：认证/会话/有效期/授权/限流（§2.1）→ TC-US01-19～26、36、38；密码哈希与 Secrets（§2.2）→ TC-US01-37；CSRF（§2.2）→ TC-US01-22、23；日志（§5）→ TC-US01-35；性能（§1）→ TC-US01-39。

**Gap 检查**：behaviors.md SC-ID 集合 {SC-LOGIN-01 … SC-LOGIN-11}（11 个）与本文件 covers 集合差集为空。

**Gap: 无**

**覆盖率目标**：需求覆盖 100%，行为覆盖 100%（verify 阶段验收基线）。

---

## 待确认事项（不阻塞，进入 design-domain / design-ui 时确认）

1. 锁定提示文案：story.md 为"请稍后再试"，behaviors.md 为"请 15 分钟后再试"（本文件以 behaviors 为准）。
2. 会话 7 天为固定有效期还是滑动续期（影响 TC-US01-24/25）。
3. 被 Origin 校验拒绝的登录请求是否计入失败计数（TC-US01-23）。
4. `next` 指向站内非后台路径时的处理（TC-US01-27 第 13 组）。

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
