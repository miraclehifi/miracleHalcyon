// SessionRepo（auth domain-model §5，data-model sessions 表）：库中只存 sha256(token)，不存明文 token
export interface AdminSession {
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface SessionRepo {
  insert(session: AdminSession): Promise<void>;
  findValid(tokenHash: string, now: Date): Promise<AdminSession | null>;
  delete(tokenHash: string): Promise<void>;
}

interface SessionRow {
  token_hash: string;
  created_at: string;
  expires_at: string;
}

export class D1SessionRepo implements SessionRepo {
  constructor(private readonly db: D1Database) {}

  async insert(session: AdminSession): Promise<void> {
    await this.db
      .prepare("INSERT INTO sessions (token_hash, created_at, expires_at) VALUES (?, ?, ?)")
      .bind(session.tokenHash, session.createdAt.toISOString(), session.expiresAt.toISOString())
      .run();
  }

  // 过期会话视为不存在，并顺带删除（不变量 2）
  async findValid(tokenHash: string, now: Date): Promise<AdminSession | null> {
    const row = await this.db
      .prepare("SELECT token_hash, created_at, expires_at FROM sessions WHERE token_hash = ?")
      .bind(tokenHash)
      .first<SessionRow>();
    if (!row) return null;
    // ISO 8601 UTC 字符串按字典序比较即时间比较（data-model"查询路径"）
    if (row.expires_at <= now.toISOString()) {
      await this.delete(tokenHash);
      return null;
    }
    return { tokenHash: row.token_hash, createdAt: new Date(row.created_at), expiresAt: new Date(row.expires_at) };
  }

  async delete(tokenHash: string): Promise<void> {
    await this.db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
}
