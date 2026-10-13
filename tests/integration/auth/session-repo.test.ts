import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { D1SessionRepo } from "../../../src/domains/auth/session-repo";

// SessionRepo（auth domain-model §5）：只存 token_hash；过期即惰性删除
const HASH = "a".repeat(64);
const CREATED = new Date("2026-10-13T00:00:00.000Z");
const EXPIRES = new Date("2026-10-20T00:00:00.000Z");
const at = (date: Date, offsetMs: number) => new Date(date.getTime() + offsetMs);

async function rowCount(tokenHash: string): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions WHERE token_hash = ?").bind(tokenHash).first<{ n: number }>();
  return row?.n ?? -1;
}

describe("D1SessionRepo", () => {
  it("insert 后命中；过期 1ms 返回 null 并删除记录；delete 后 null", async () => {
    const repo = new D1SessionRepo(env.DB);
    const expiredHash = "b".repeat(64);
    await repo.insert({ tokenHash: HASH, createdAt: CREATED, expiresAt: EXPIRES });
    await repo.insert({ tokenHash: expiredHash, createdAt: CREATED, expiresAt: EXPIRES });

    const found = await repo.findValid(HASH, at(EXPIRES, -1));
    const expired = await repo.findValid(expiredHash, at(EXPIRES, 1));
    const expiredRows = await rowCount(expiredHash);
    await repo.delete(HASH);
    const afterDelete = await repo.findValid(HASH, CREATED);

    expect({ found, expired, expiredRows, afterDelete }).toEqual({
      found: { tokenHash: HASH, createdAt: CREATED, expiresAt: EXPIRES },
      expired: null,
      expiredRows: 0,
      afterDelete: null,
    });
  });
});
