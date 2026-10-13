// 单元测试用内存仓储，行为与 D1 实现一致（过期会话惰性删除）
import type { AdminSession, SessionRepo } from "../../../src/domains/auth/session-repo";
import type { ThrottleState } from "../../../src/domains/auth/throttle";
import type { ThrottleRepo } from "../../../src/domains/auth/throttle-repo";

export class MemorySessionRepo implements SessionRepo {
  rows = new Map<string, AdminSession>();

  async insert(session: AdminSession) {
    this.rows.set(session.tokenHash, session);
  }

  async findValid(tokenHash: string, now: Date) {
    const session = this.rows.get(tokenHash);
    if (!session) return null;
    if (session.expiresAt.getTime() <= now.getTime()) {
      this.rows.delete(tokenHash);
      return null;
    }
    return session;
  }

  async delete(tokenHash: string) {
    this.rows.delete(tokenHash);
  }
}

export class MemoryThrottleRepo implements ThrottleRepo {
  rows = new Map<string, ThrottleState>();

  async get(ip: string) {
    return this.rows.get(ip) ?? null;
  }

  async put(ip: string, state: ThrottleState) {
    this.rows.set(ip, state);
  }

  async delete(ip: string) {
    this.rows.delete(ip);
  }
}
