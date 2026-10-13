# ADR-003: 服务端会话存 D1

## 状态
Accepted（2026-10-12）

## 背景
NFR 要求服务端会话、7 天有效期、登出立即失效（US-02-2），并按 IP 限流。项目只有一位管理员，请求量极低。

## 决策
- 生成 32 字节随机 Token 写入 Cookie `mh_session`（HttpOnly、Secure、SameSite=Lax）。D1 `sessions` 表只存 `sha256(token)`。
- 登出删除对应记录；过期记录在校验时惰性删除。
- 限流用 D1 `login_attempts`（按 `CF-Connecting-IP`）。
- 密码使用 PBKDF2-SHA256，迭代 100,000 次（WebCrypto 在 Workers 上的上限）。哈希通过 Secrets 注入。

## 备选
- JWT：无法在登出时立即失效，否决。
- KV：最终一致，登出后可能还有短暂窗口仍然有效；D1 已经存在，否决。

## 后果
每个后台请求多一次 D1 查询，对单用户的请求量可以忽略。
