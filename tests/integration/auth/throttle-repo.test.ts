import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { D1ThrottleRepo } from "../../../src/domains/auth/throttle-repo";

// ThrottleRepo（auth domain-model §5）：按 ip 主键 upsert
const IP = "203.0.113.7";
const LOCKED_UNTIL = new Date("2026-10-13T00:15:00.000Z");

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
});
