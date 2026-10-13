// ThrottleRepo（auth domain-model §5，data-model login_attempts 表）
import type { ThrottleState } from "./throttle";

export interface ThrottleRepo {
  get(ip: string): Promise<ThrottleState | null>;
  put(ip: string, state: ThrottleState): Promise<void>;
  delete(ip: string): Promise<void>;
}

interface ThrottleRow {
  fail_count: number;
  locked_until: string | null;
}

export class D1ThrottleRepo implements ThrottleRepo {
  constructor(private readonly db: D1Database) {}

  async get(ip: string): Promise<ThrottleState | null> {
    const row = await this.db.prepare("SELECT fail_count, locked_until FROM login_attempts WHERE ip = ?").bind(ip).first<ThrottleRow>();
    if (!row) return null;
    return { failCount: row.fail_count, lockedUntil: row.locked_until ? new Date(row.locked_until) : null };
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
}
