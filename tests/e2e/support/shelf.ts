import { expect, type APIRequestContext } from "@playwright/test";

// 书影音 E2E 造数据：经接口创建（multipart，带同源 Origin）；标题带唯一前缀，结束时按前缀删除（本地 D1 跨运行共享）
export const PREFIX = `e2e-${Math.random().toString(36).slice(2, 8)}`;

export interface EntryFields {
  type?: string;
  title: string;
  creator?: string | null;
  status?: "completed" | "in_progress";
  rating?: number | null;
  markedOn?: string;
  comment?: string | null;
  platform?: string; // 游戏必填（ADR-013）
  coverUrl?: string | null;
}

export function shelfApi(request: APIRequestContext, baseURL: string) {
  const headers = { Origin: new URL(baseURL).origin };
  return {
    async create(fields: EntryFields): Promise<{ id: string; title: string }> {
      const body = { type: "book", status: "completed", markedOn: "2026-10-01", ...fields };
      const response = await request.post("/api/admin/shelf/entries", { headers, multipart: { fields: JSON.stringify(body) } });
      expect(response.status()).toBe(201);
      return response.json();
    },
    async list(type: string): Promise<{ id: string; title: string }[]> {
      const response = await request.get(`/api/admin/shelf/entries?type=${type}`);
      return ((await response.json()) as { items: { id: string; title: string }[] }).items;
    },
    async removeByPrefix(prefix = PREFIX) {
      for (const type of ["book", "comic", "movie", "series", "game", "boardgame"]) {
        for (const entry of await this.list(type)) {
          if (entry.title.startsWith(prefix)) await request.delete(`/api/admin/shelf/entries/${entry.id}`, { headers });
        }
      }
    },
  };
}
