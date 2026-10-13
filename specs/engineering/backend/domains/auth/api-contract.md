# auth API 契约

**最后更新**: 2026-10-13
**状态**: self-checked

> 通用约定（错误体、字段格式）见 [domains/_index.md](../_index.md)。

---

## POST /api/admin/login

登录。middleware 对此路径不校验会话，但校验 Origin。

**请求**（`application/json`）

| 字段 | 类型 | 必填 | 规则 |
|------|------|------|------|
| `username` | string | ✅ | 1–64 字符 |
| `password` | string | ✅ | 1–256 字符 |

**响应**

| 状态 | 体 | 说明 |
|------|----|------|
| 204 | — | 成功；`Set-Cookie: mh_session=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`（本地 http 开发环境去掉 `Secure`） |
| 400 | `VALIDATION_FAILED`："请输入账号和密码" | 缺字段、类型不是 string、JSON 无法解析 |
| 401 | `INVALID_CREDENTIALS`："账号或密码错误，请检查后重试" | 不区分账号错还是密码错；超长输入也走这里 |
| 403 | `FORBIDDEN_ORIGIN` | Origin 不符 |
| 429 | `RATE_LIMITED`："尝试次数过多，请 15 分钟后再试" | 带 `Retry-After: <剩余秒数>` |
| 500 | `SERVER_MISCONFIGURED` | Secrets 缺失 |

跳转目标由前端读取页面 URL 的 `next`，经 `sanitizeNext` 后 `location.assign`（服务端在 `/admin/login` 页面 SSR 时已把清洗后的 `next` 注入 props）。

## POST /api/admin/logout

登出。需要会话（无会话时 middleware 返回 401）。

| 状态 | 体 | 说明 |
|------|----|------|
| 204 | — | 删除服务端会话；`Set-Cookie: mh_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax` |
| 401 | `UNAUTHENTICATED` | 无会话或已失效 |
| 403 | `FORBIDDEN_ORIGIN` | Origin 不符 |

`GET /api/admin/logout` → 405 `METHOD_NOT_ALLOWED`，不改变会话（防止通过图片链接等方式触发登出）。

## 通用 401 / 403

所有 `/api/admin/**`（login 除外）：

| 状态 | 体 |
|------|----|
| 401 | `{ "error": { "code": "UNAUTHENTICATED", "message": "登录已过期，请重新登录" } }` |
| 403 | `{ "error": { "code": "FORBIDDEN_ORIGIN", "message": "请求来源不受信任" } }` |

401 响应不包含任何资源信息；对不存在的资源也返回 401（未登录时不暴露资源是否存在）。

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
