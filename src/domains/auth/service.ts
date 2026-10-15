// AuthService（auth domain-model §4）
import { sha256, sha256Hex } from "../../lib/crypto";
import { verifyPassword, type PasswordHash } from "./password";
import type { AdminSession, SessionRepo } from "./session-repo";
import { isLocked } from "./throttle";
import type { ThrottleRepo } from "./throttle-repo";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60_000; // 不滑动续期
const TOKEN_BYTES = 32;
const USERNAME_MAX = 64;
const PASSWORD_MAX = 256;

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; code: "INVALID_CREDENTIALS" }
  | { ok: false; code: "RATE_LIMITED"; lockedUntil: Date };

export interface LoginInput {
  ip: string;
  username: string;
  password: string;
  now: Date;
}

export interface AuthDeps {
  sessions: SessionRepo;
  throttles: ThrottleRepo;
  adminUsername: string;
  adminPasswordHash: PasswordHash;
  verify?: typeof verifyPassword;
}

// TokenHash：SHA-256(token) 小写 hex
export function hashToken(token: string): Promise<string> {
  return sha256Hex(token);
}

// SessionToken：32 字节随机数 base64url（43 字符）
function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 比较两边的摘要：耗时与输入内容、长度都无关
async function usernameMatches(input: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(input), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function credentialsInRange(username: string, password: string): boolean {
  return username.length >= 1 && username.length <= USERNAME_MAX && password.length >= 1 && password.length <= PASSWORD_MAX;
}

export function createAuthService(deps: AuthDeps) {
  const verify = deps.verify ?? verifyPassword;

  const invalid: LoginResult = { ok: false, code: "INVALID_CREDENTIALS" };

  return {
    async login({ ip, username, password, now }: LoginInput): Promise<LoginResult> {
      // 比对前先原子地记一次失败（成功再清除）：同一 IP 的并发请求不会都读到"未锁定"而绕过限流
      const throttle = await deps.throttles.reserve(ip, now);
      if (throttle?.lockedUntil && isLocked(throttle, now)) return { ok: false, code: "RATE_LIMITED", lockedUntil: throttle.lockedUntil };
      if (!credentialsInRange(username, password)) return invalid; // 超长不做哈希

      // 无论账号是否正确都比对一次密码，避免时序差异泄露账号是否存在
      const [userOk, passwordOk] = await Promise.all([
        usernameMatches(username, deps.adminUsername),
        verify(password, deps.adminPasswordHash),
      ]);
      if (!userOk || !passwordOk) return invalid;

      await deps.throttles.delete(ip);
      const token = generateToken();
      const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
      await deps.sessions.insert({ tokenHash: await hashToken(token), createdAt: now, expiresAt });
      return { ok: true, token, expiresAt };
    },

    async getSession(token: string | undefined, now: Date): Promise<AdminSession | null> {
      if (!token) return null;
      return deps.sessions.findValid(await hashToken(token), now);
    },

    // 只删除当前会话（其他设备的会话不受影响）；无 / 无效 token 什么也不做（登出幂等）
    async logout(token: string | undefined): Promise<void> {
      if (token) await deps.sessions.delete(await hashToken(token));
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
