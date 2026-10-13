import { describe, expect, it } from "vitest";
import { createAuthService, hashToken } from "../../../src/domains/auth/service";
import { MemorySessionRepo, MemoryThrottleRepo } from "./memory-repos";

// [AUTH-UT-05] AuthService.getSession：sha256(token) → findValid
const TOKEN = "t".repeat(43);
const EXPIRED_TOKEN = "e".repeat(43);
const CREATED = new Date("2026-10-13T00:00:00.000Z");
const EXPIRES = new Date("2026-10-20T00:00:00.000Z");
const NOW = new Date("2026-10-14T00:00:00.000Z");

describe("AuthService.getSession", () => {
  it("[AUTH-UT-05] 有效返回会话；过期 1ms 返回 null 并删除；未知 token 与 undefined 返回 null", async () => {
    const sessions = new MemorySessionRepo();
    const service = createAuthService({ sessions, throttles: new MemoryThrottleRepo(), adminUsername: "a", adminPasswordHash: "x" });
    const valid = { tokenHash: await hashToken(TOKEN), createdAt: CREATED, expiresAt: EXPIRES };
    const expiredHash = await hashToken(EXPIRED_TOKEN);
    await sessions.insert(valid);
    await sessions.insert({ tokenHash: expiredHash, createdAt: CREATED, expiresAt: new Date(NOW.getTime() - 1) });

    expect({
      valid: await service.getSession(TOKEN, NOW),
      expired: await service.getSession(EXPIRED_TOKEN, NOW),
      expiredDeleted: !sessions.rows.has(expiredHash),
      unknown: await service.getSession("u".repeat(43), NOW),
      missing: await service.getSession(undefined, NOW),
    }).toEqual({ valid, expired: null, expiredDeleted: true, unknown: null, missing: null });
  });
});
