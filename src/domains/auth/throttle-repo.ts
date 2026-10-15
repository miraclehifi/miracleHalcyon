// ThrottleRepo（auth domain-model §5，data-model login_attempts 表）
import { LOCK_MS, MAX_FAILURES, type ThrottleState } from "./throttle";

export interface ThrottleRepo {
  get(ip: string): Promise<ThrottleState | null>;
  put(ip: string, state: ThrottleState): Promise<void>;
  delete(ip: string): Promise<void>;
  // 原子地按 nextThrottleState(·, "fail") 计一次失败，返回计数前的状态（并发请求不会丢计数）
  reserve(ip: string, now: Date): Promise<ThrottleState | null>;
}

interface ThrottleRow {
  fail_count: number;
  locked_until: string | null;
}

const toState = (row: ThrottleRow | null | undefined): ThrottleState | null =>
  row ? { failCount: row.fail_count, lockedUntil: row.locked_until ? new Date(row.locked_until) : null } : null;

// nextThrottleState(state, "fail", now) 的 SQL 版：锁定中不变；锁已过期视为 0；达到上限加锁并清零
const NEXT_COUNT = "(CASE WHEN locked_until IS NOT NULL THEN 0 ELSE fail_count END) + 1";
const RESERVE_SQL =
  "INSERT INTO login_attempts (ip, fail_count, locked_until) VALUES (?1, 1, NULL) ON CONFLICT(ip) DO UPDATE SET " +
  `fail_count = CASE WHEN locked_until > ?2 THEN fail_count WHEN ${NEXT_COUNT} >= ${MAX_FAILURES} THEN 0 ELSE ${NEXT_COUNT} END, ` +
  `locked_until = CASE WHEN locked_until > ?2 THEN locked_until WHEN ${NEXT_COUNT} >= ${MAX_FAILURES} THEN ?3 ELSE NULL END`;

export class D1ThrottleRepo implements ThrottleRepo {
  constructor(private readonly db: D1Database) {}

  async get(ip: string): Promise<ThrottleState | null> {
    return toState(await this.db.prepare("SELECT fail_count, locked_until FROM login_attempts WHERE ip = ?").bind(ip).first<ThrottleRow>());
  }

  async put(ip: string, state: ThrottleState): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO login_attempts (ip, fail_count, locked_until) VALUES (?1, ?2, ?3) " +
          "ON CONFLICT(ip) DO UPDATE SET fail_count = excluded.fail_count, locked_until = excluded.locked_until",
      )
      .bind(ip, state.failCount, state.lockedUntil?.toISOString() ?? null)
      .run();
  }

  async delete(ip: string): Promise<void> {
    await this.db.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
  }

  // batch 在一个事务中执行：读到的旧值与这次更新之间不会插入其他请求的写入
  async reserve(ip: string, now: Date): Promise<ThrottleState | null> {
    const [before] = await this.db.batch<ThrottleRow>([
      this.db.prepare("SELECT fail_count, locked_until FROM login_attempts WHERE ip = ?").bind(ip),
      this.db.prepare(RESERVE_SQL).bind(ip, now.toISOString(), new Date(now.getTime() + LOCK_MS).toISOString()),
    ]);
    return toState(before.results[0]);
  }
}
