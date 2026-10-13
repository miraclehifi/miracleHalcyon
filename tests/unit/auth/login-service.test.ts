import { beforeAll, describe, expect, it, vi } from "vitest";
import { hashPassword, verifyPassword } from "../../../src/domains/auth/password";
import { createAuthService, hashToken } from "../../../src/domains/auth/service";
import type { AdminSession, SessionRepo } from "../../../src/domains/auth/session-repo";
import type { ThrottleState } from "../../../src/domains/auth/throttle";
import type { ThrottleRepo } from "../../../src/domains/auth/throttle-repo";

// [AUTH-UT-04] AuthService.login（内存仓储）
const USERNAME = "halcyon";
const PASSWORD = "s3cret-password";
const IP = "203.0.113.7";
const NOW = new Date("2026-10-13T00:00:00.000Z");
const LOCKED: ThrottleState = { failCount: 0, lockedUntil: new Date("2026-10-13T00:10:00.000Z") };
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60_000;

class MemorySessionRepo implements SessionRepo {
  rows = new Map<string, AdminSession>();
  async insert(s: AdminSession) { this.rows.set(s.tokenHash, s); }
  async findValid(tokenHash: string) { return this.rows.get(tokenHash) ?? null; }
  async delete(tokenHash: string) { this.rows.delete(tokenHash); }
}

class MemoryThrottleRepo implements ThrottleRepo {
  rows = new Map<string, ThrottleState>();
  async get(ip: string) { return this.rows.get(ip) ?? null; }
  async put(ip: string, s: ThrottleState) { this.rows.set(ip, s); }
  async delete(ip: string) { this.rows.delete(ip); }
}

let adminPasswordHash: string;
beforeAll(async () => {
  adminPasswordHash = await hashPassword(PASSWORD);
});

function setup(throttle?: ThrottleState) {
  const sessions = new MemorySessionRepo();
  const throttles = new MemoryThrottleRepo();
  if (throttle) throttles.rows.set(IP, throttle);
  const verify = vi.fn(verifyPassword);
  const service = createAuthService({ sessions, throttles, adminUsername: USERNAME, adminPasswordHash, verify });
  return { service, sessions, throttles, verify };
}

describe("AuthService.login", () => {
  it("[AUTH-UT-04] 正确凭据签发会话；错误密码 / 错误账号计失败；锁定中不比对密码直接限流", async () => {
    const ok = setup({ failCount: 3, lockedUntil: null });
    const okResult = await ok.service.login({ ip: IP, username: USERNAME, password: PASSWORD, now: NOW });
    const token = okResult.ok ? okResult.token : "";

    const wrongPassword = setup();
    const wrongPasswordResult = await wrongPassword.service.login({ ip: IP, username: USERNAME, password: "nope", now: NOW });

    const wrongUser = setup();
    const wrongUserResult = await wrongUser.service.login({ ip: IP, username: "intruder", password: PASSWORD, now: NOW });

    const locked = setup(LOCKED);
    const lockedResult = await locked.service.login({ ip: IP, username: USERNAME, password: PASSWORD, now: NOW });

    expect({
      ok: { result: okResult, tokenLength: token.length, stored: [...ok.sessions.rows.values()], throttle: ok.throttles.rows.get(IP) ?? null },
      wrongPassword: { result: wrongPasswordResult, throttle: wrongPassword.throttles.rows.get(IP), sessions: wrongPassword.sessions.rows.size },
      wrongUser: { result: wrongUserResult, verified: wrongUser.verify.mock.calls.length, throttle: wrongUser.throttles.rows.get(IP) },
      locked: { result: lockedResult, verified: locked.verify.mock.calls.length, throttle: locked.throttles.rows.get(IP), sessions: locked.sessions.rows.size },
    }).toEqual({
      ok: {
        result: { ok: true, token: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/), expiresAt: new Date(NOW.getTime() + SEVEN_DAYS_MS) },
        tokenLength: 43,
        stored: [{ tokenHash: await hashToken(token), createdAt: NOW, expiresAt: new Date(NOW.getTime() + SEVEN_DAYS_MS) }],
        throttle: null,
      },
      wrongPassword: { result: { ok: false, code: "INVALID_CREDENTIALS" }, throttle: { failCount: 1, lockedUntil: null }, sessions: 0 },
      wrongUser: { result: { ok: false, code: "INVALID_CREDENTIALS" }, verified: 1, throttle: { failCount: 1, lockedUntil: null } },
      locked: { result: { ok: false, code: "RATE_LIMITED" }, verified: 0, throttle: LOCKED, sessions: 0 },
    });
  });
});
