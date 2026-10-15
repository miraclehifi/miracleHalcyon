import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { createAuthService } from "../../../src/domains/auth/service";
import { D1SessionRepo } from "../../../src/domains/auth/session-repo";
import { D1ThrottleRepo } from "../../../src/domains/auth/throttle-repo";

// ThrottleRepo（auth domain-model §5）：按 ip 主键 upsert
const IP = "203.0.113.7";
const LOCKED_UNTIL = new Date("2026-10-13T00:15:00.000Z");
const NOW = new Date("2026-10-13T00:00:00.000Z");

describe("D1ThrottleRepo", () => {
  it("put 两次后 get 为最新值；delete 后 null", async () => {
    const repo = new D1ThrottleRepo(env.DB);

    await repo.put(IP, { failCount: 4, lockedUntil: null });
    await repo.put(IP, { failCount: 0, lockedUntil: LOCKED_UNTIL });
    const latest = await repo.get(IP);
    await repo.delete(IP);

    expect({ latest, afterDelete: await repo.get(IP) }).toEqual({
      latest: { failCount: 0, lockedUntil: LOCKED_UNTIL },
      afterDelete: null,
    });
  });

  it("reserve 原子地计一次失败并返回之前的状态：计数、第 5 次加锁、锁定中不变、锁过期重新计数", async () => {
    const repo = new D1ThrottleRepo(env.DB);
    const ip = "203.0.113.30";
    const before = [];
    for (let i = 0; i < 6; i++) before.push(await repo.reserve(ip, NOW));
    const locked = await repo.get(ip);
    const expired = new Date(NOW.getTime() + 15 * 60_000);
    const afterExpiry = await repo.reserve(ip, expired);
    expect({ before, locked, afterExpiry, now: await repo.get(ip) }).toEqual({
      before: [
        null,
        { failCount: 1, lockedUntil: null },
        { failCount: 2, lockedUntil: null },
        { failCount: 3, lockedUntil: null },
        { failCount: 4, lockedUntil: null },
        { failCount: 0, lockedUntil: expired },
      ],
      locked: { failCount: 0, lockedUntil: expired },
      afterExpiry: { failCount: 0, lockedUntil: expired },
      now: { failCount: 1, lockedUntil: null },
    });
  });

  // [SC-LOGIN-06] 同一 IP 并发登录不能绕过"连续失败 5 次锁定"：最多比对 5 次密码
  it("[SC-LOGIN-06] 同一 IP 并发 10 次错误登录：只比对 5 次密码，其余 429", async () => {
    const ip = "203.0.113.31";
    const verify = vi.fn(async () => false);
    const service = createAuthService({ sessions: new D1SessionRepo(env.DB), throttles: new D1ThrottleRepo(env.DB), adminUsername: "a", adminPasswordHash: "x", verify });
    const results = await Promise.all(Array.from({ length: 10 }, () => service.login({ ip, username: "a", password: "wrong", now: NOW })));
    const codes = results.map((result) => (result.ok ? "ok" : result.code)).sort();
    expect({ verified: verify.mock.calls.length, codes }).toEqual({
      verified: 5,
      codes: [...Array(5).fill("INVALID_CREDENTIALS"), ...Array(5).fill("RATE_LIMITED")],
    });
  });
});
