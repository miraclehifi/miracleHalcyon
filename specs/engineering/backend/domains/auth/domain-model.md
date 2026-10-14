# auth 领域模型

**最后更新**: 2026-10-13
**状态**: self-checked
**来源**: [feature-architecture.md](../../../features/F-001-文章写作/architecture/feature-architecture.md) §2、§5 · [ADR-003](../../../features/F-001-文章写作/architecture/adr/ADR-003-d1-session.md)

---

## 1. 职责与边界

- 负责：管理员凭据校验、会话签发 / 校验 / 失效、按 IP 的登录限流、`next` 回跳地址校验
- 不负责：页面跳转（middleware 决定 302 还是 401）、业务授权（只有一个管理员，有会话即全部权限）
- 对外只暴露 `AuthService`；其他 Domain 不感知认证

## 2. 聚合

### 2.1 AdminSession（聚合根）

| 属性 | 类型 | 说明 |
|------|------|------|
| tokenHash | `TokenHash`（值对象） | `sha256(token)` 的 hex；token 本身只出现在 Cookie 中 |
| createdAt | 时间戳 | 签发时间 |
| expiresAt | 时间戳 | `createdAt + 7 天`，不滑动续期 |

**不变量**
1. 库中永远不存明文 token
2. `expiresAt ≤ now` 的会话视为不存在（校验时惰性删除）
3. 登出后同一 token 立即失效（记录被删除）

### 2.2 LoginThrottle（聚合根，按 IP）

> 状态规则已实现：`src/domains/auth/throttle.ts`（`nextThrottleState`、`isLocked`）

| 属性 | 类型 | 说明 |
|------|------|------|
| ip | string | `CF-Connecting-IP`；本地开发取 `127.0.0.1` |
| failCount | integer | 连续失败次数 |
| lockedUntil | 时间戳? | 非空且 > now 时锁定 |

**不变量**
1. 锁定期内任何登录尝试（含正确密码）都返回 `RATE_LIMITED`，且不增加 failCount、不比对密码
2. `failCount` 达到 5 时设置 `lockedUntil = now + 15 分钟`，并把 failCount 归零
3. 登录成功时删除该 IP 的记录
4. 锁定过期后第一次尝试按正常流程处理（记录视为 failCount = 0）

## 3. 值对象

| 值对象 | 规则 |
|--------|------|
| `SessionToken` | 32 字节 `crypto.getRandomValues`，base64url 编码（43 字符） |
| `TokenHash` | `SHA-256(token)` 的小写 hex（64 字符） |
| `PasswordHash` | 字符串 `pbkdf2$<iterations>$<saltB64>$<hashB64>`；算法 PBKDF2-SHA256，iterations = 100000，salt 16 字节，hash 32 字节（已实现：`src/domains/auth/password.ts`；校验时 iterations > 100000 视为无效，Workers 上限） |
| `Credentials` | `username`：1–64 字符；`password`：1–256 字符（超出直接按凭据错误处理，不做哈希） |
| `SafeNext` | 必须是 `/admin` 或以 `/admin/`、`/admin?`、`/admin#` 开头，不含 `\` 与控制字符（因此不可能以 `//` 开头或带协议）；否则回退为 `/admin`（已实现：`src/domains/auth/next.ts`） |

## 4. 领域服务

```ts
interface AuthService {
  login(input: { ip: string; username: string; password: string; now: Date }):
    Promise<{ ok: true; token: string; expiresAt: Date }   // 已实现
           | { ok: false; code: 'INVALID_CREDENTIALS' }
           | { ok: false; code: 'RATE_LIMITED'; lockedUntil: Date }>; // lockedUntil 供 429 Retry-After
  getSession(token: string | undefined, now: Date): Promise<AdminSession | null>; // 已实现
  logout(token: string | undefined): Promise<void>; // 幂等
}

// 纯函数（无 I/O）
function verifyPassword(password: string, stored: PasswordHash): Promise<boolean>; // WebCrypto，常量时间比较
function hashPassword(password: string, salt?: Uint8Array): Promise<PasswordHash>; // 供 npm run hash-password
function sanitizeNext(next: string | null): string;
function nextThrottleState(state: ThrottleState | null, event: 'fail' | 'success', now: Date): ThrottleState | null;
```

**login 流程**（已实现：`createAuthService().login`，`src/domains/auth/service.ts`；账号比较两边 SHA-256 摘要，耗时与长度无关；`Credentials` 超长按失败计数、不做哈希）：
1. 读 throttle → 锁定中返回 `RATE_LIMITED`
2. username 常量时间比较 `ADMIN_USERNAME`；无论 username 是否正确，都执行一次 `verifyPassword`，避免时序差异泄露账号是否存在
3. 失败 → `nextThrottleState(fail)` 写回 → `INVALID_CREDENTIALS`（第 5 次失败本身返回 `INVALID_CREDENTIALS`，第 6 次起才返回 `RATE_LIMITED`）
4. 成功 → 删除 throttle → 生成 token → 插入会话 → 返回 token

## 5. 仓储接口

```ts
interface SessionRepo { // 已实现：D1SessionRepo（src/domains/auth/session-repo.ts）
  insert(s: { tokenHash: string; createdAt: Date; expiresAt: Date }): Promise<void>;
  findValid(tokenHash: string, now: Date): Promise<AdminSession | null>; // 过期则顺带删除并返回 null
  delete(tokenHash: string): Promise<void>;
}
interface ThrottleRepo { // 已实现：D1ThrottleRepo（src/domains/auth/throttle-repo.ts）
  get(ip: string): Promise<ThrottleState | null>;
  put(ip: string, s: ThrottleState): Promise<void>;
  delete(ip: string): Promise<void>;
}
```

## 6. 配置（Secrets / 环境变量）

| 名称 | 说明 |
|------|------|
| `ADMIN_USERNAME` | 管理员账号 |
| `ADMIN_PASSWORD_HASH` | `PasswordHash` 格式字符串，由 `npm run hash-password` 生成（已实现：`scripts/hash-password.ts`；配置步骤见 README） |
| `SITE_ORIGIN` | 站点 Origin（如 `https://miraclehalcyon.com`），CSRF 校验用；本地为 `http://localhost:4321` |

缺少任一配置时，登录接口返回 500 `SERVER_MISCONFIGURED`，日志记录配置名（不记录值）。

## 7. Middleware 行为（`src/middleware.ts`）

> 已实现：`createAuthMiddleware(deps)` + `onRequest`（env 取自 `cloudflare:workers`）。非 GET/HEAD 请求先校验 Origin（`/admin/**` 页面与 `/api/admin/**` 都校验）；`SITE_ORIGIN` 缺失时非 GET 请求返回 500 `SERVER_MISCONFIGURED`（无法校验来源即拒绝写操作）。

| 请求 | 无效会话 | Origin 不符（非 GET/HEAD） |
|------|---------|--------------------------|
| `/admin/login` | 放行 | — |
| 其他 `/admin/**` 页面 | 302 → `/admin/login?next={原路径+查询}` | — |
| `POST /api/admin/login` | 放行 | 403 `FORBIDDEN_ORIGIN` |
| 其他 `/api/admin/**` | 401 `UNAUTHENTICATED`（不区分资源是否存在） | 403 `FORBIDDEN_ORIGIN` |

- 有效会话访问 `/admin/login` → 302 到 `sanitizeNext(next)`
- Origin 校验：取 `Origin` 头，缺失时取 `Referer` 的 origin；两者都缺失 → 403
- 会话对象写入 `Astro.locals.session`
- 拒绝写请求（401 / 403 / 500）前先读完请求体：本地 preview（miniflare）中带请求体的请求未读就返回，同一连接上的下一个请求会失败（2026-10-14，handle-session-expired-save 发现）

## 8. 服务的需求

| US | 使用的能力 |
|----|-----------|
| US-01 admin-login | `login`、`getSession`、`sanitizeNext`、限流、middleware |
| US-02 admin-logout | `logout`、`getSession`（旧 token 失效） |
| US-03 – US-12 | middleware 保护（写接口 401、页面跳转） |

## 9. 单元测试规格

| UT-ID | 对象 | 用例 | 预期 |
|-------|------|------|------|
| AUTH-UT-01 | `hashPassword` / `verifyPassword` | 往返；错误密码；篡改 salt；iterations 字段非数字 | 往返 true；其余 false，不抛异常 |
| AUTH-UT-02 | `nextThrottleState` | 连续 fail 1–5 次；锁定中再 fail；锁定过期后 fail；success | 第 5 次设置 lockedUntil = now+15min 且 failCount 归零；锁定中状态不变；过期后从 1 开始；success → null |
| AUTH-UT-03 | `sanitizeNext` | `/admin/posts/1?x=1`、`/admin`、`//evil.com`、`https://evil.com`、`/\evil`、`/posts`、null | 前两个原样；其余 `/admin` |
| AUTH-UT-04 | `AuthService.login`（内存仓储） | 正确凭据；错误密码；错误账号；锁定中正确密码 | ok + token（43 字符）；`INVALID_CREDENTIALS` ×2；`RATE_LIMITED` 且未调用 verifyPassword 之外的写入 |
| AUTH-UT-05 | `getSession` | 有效；过期 1ms；未知 token；undefined | 返回会话；null 并删除；null；null |
| AUTH-UT-06 | `logout` | 已登录 token；重复 logout；undefined | 记录删除；幂等不抛错 |
| AUTH-UT-07 | middleware（Workers 集成） | 上表 4 类请求 × 有/无会话 × Origin 同源/异源/缺失 | 与 §7 表一致 |

---

## 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|----------|------|
| 2026-10-13 | 1.0 | 初始版本 | miraclehifi |
