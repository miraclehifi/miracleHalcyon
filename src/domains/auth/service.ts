// AuthService（auth domain-model §4）
import { verifyPassword, type PasswordHash } from "./password";
import type { AdminSession, SessionRepo } from "./session-repo";
import { isLocked, nextThrottleState } from "./throttle";
import type { ThrottleRepo } from "./throttle-repo";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60_000; // 不滑动续期
const TOKEN_BYTES = 32;
const USERNAME_MAX = 64;
const PASSWORD_MAX = 256;

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date }
  | { ok: false; code: "INVALID_CREDENTIALS" | "RATE_LIMITED" };

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

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

// TokenHash：SHA-256(token) 小写 hex
export async function hashToken(token: string): Promise<string> {
  return Array.from(await sha256(token), (b) => b.toString(16).padStart(2, "0")).join("");
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

  async function recordFailure(ip: string, now: Date): Promise<LoginResult> {
    const state = nextThrottleState(await deps.throttles.get(ip), "fail", now);
    if (state) await deps.throttles.put(ip, state);
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }

  return {
    async login({ ip, username, password, now }: LoginInput): Promise<LoginResult> {
      if (isLocked(await deps.throttles.get(ip), now)) return { ok: false, code: "RATE_LIMITED" };
      if (!credentialsInRange(username, password)) return recordFailure(ip, now); // 超长不做哈希

      // 无论账号是否正确都比对一次密码，避免时序差异泄露账号是否存在
      const [userOk, passwordOk] = await Promise.all([
        usernameMatches(username, deps.adminUsername),
        verify(password, deps.adminPasswordHash),
      ]);
      if (!userOk || !passwordOk) return recordFailure(ip, now);

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
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
