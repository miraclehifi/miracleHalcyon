// LoginThrottle 状态规则（auth domain-model §2.2），按 IP，纯函数
export const MAX_FAILURES = 5;
export const LOCK_MS = 15 * 60_000;

export interface ThrottleState {
  failCount: number;
  lockedUntil: Date | null;
}

export type ThrottleEvent = "fail" | "success";

export function isLocked(state: ThrottleState | null, now: Date): boolean {
  return state?.lockedUntil != null && state.lockedUntil.getTime() > now.getTime();
}

// 返回 null 表示删除该 IP 的记录
export function nextThrottleState(state: ThrottleState | null, event: ThrottleEvent, now: Date): ThrottleState | null {
  if (event === "success") return null;
  if (isLocked(state, now)) return state; // 锁定期内不计数
  const failCount = (state?.lockedUntil ? 0 : (state?.failCount ?? 0)) + 1; // 锁定过期视为 failCount = 0
  if (failCount >= MAX_FAILURES) return { failCount: 0, lockedUntil: new Date(now.getTime() + LOCK_MS) };
  return { failCount, lockedUntil: null };
}
