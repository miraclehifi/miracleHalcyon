import { describe, expect, it } from "vitest";
import { isLocked, nextThrottleState, type ThrottleState } from "../../../src/domains/auth/throttle";

// [AUTH-UT-02] LoginThrottle 不变量（auth domain-model §2.2）
const NOW = new Date("2026-10-13T00:00:00.000Z");
const LOCK_END = new Date("2026-10-13T00:15:00.000Z");
const minutesLater = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

function failTimes(times: number): ThrottleState | null {
  let state: ThrottleState | null = null;
  for (let i = 0; i < times; i++) state = nextThrottleState(state, "fail", NOW);
  return state;
}

describe("nextThrottleState", () => {
  it("[AUTH-UT-02] 第 5 次失败锁 15 分钟并归零；锁定中不变；过期后从 1 起算；成功清除", () => {
    const locked = failTimes(5);

    expect({
      afterFour: failTimes(4),
      afterFive: locked,
      lockedNow: isLocked(locked, NOW),
      failWhileLocked: nextThrottleState(locked, "fail", minutesLater(5)),
      failAfterExpiry: nextThrottleState(locked, "fail", minutesLater(15)),
      unlockedAtExpiry: isLocked(locked, minutesLater(15)),
      success: nextThrottleState(failTimes(3), "success", NOW),
    }).toEqual({
      afterFour: { failCount: 4, lockedUntil: null },
      afterFive: { failCount: 0, lockedUntil: LOCK_END },
      lockedNow: true,
      failWhileLocked: { failCount: 0, lockedUntil: LOCK_END },
      failAfterExpiry: { failCount: 1, lockedUntil: null },
      unlockedAtExpiry: false,
      success: null,
    });
  });
});
